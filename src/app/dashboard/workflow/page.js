'use client';

import { useState, useMemo, useEffect, useRef, useContext } from 'react';
import dynamic from 'next/dynamic';
import { parse } from 'csv-parse/sync';
import { WorkflowContext } from '../layout';

// Dynamic import for client-side only rendering
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function WorkflowMapping() {
  const [csvText, setCsvText] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef();
  const { addWorkflowLog } = useContext(WorkflowContext);

  useEffect(() => { setIsClient(true); }, []);

  const handleProcessCSV = () => {
    if (!csvText.trim()) return;

    try {
      const records = parse(csvText, { columns: true, skip_empty_lines: true });
      
      const nodesMap = new Map();
      const links = [];

      // Expected CSV format: case_id, activity, dept, duration_hrs
      records.forEach((row, index) => {
        if (!nodesMap.has(row.activity)) {
          nodesMap.set(row.activity, { 
            id: row.activity, 
            name: row.activity, 
            dept: row.dept || 'Unknown',
            val: 1 // size
          });
        } else {
          nodesMap.get(row.activity).val += 0.5;
        }

        // Simple sequence linking within same case_id
        if (index > 0 && records[index - 1].case_id === row.case_id) {
          links.push({
            source: records[index - 1].activity,
            target: row.activity,
            duration: parseFloat(row.duration_hrs) || 1
          });
        }
      });

      setGraphData({
        nodes: Array.from(nodesMap.values()),
        links: links
      });
      addWorkflowLog(`Processed ${records.length} events across ${nodesMap.size} activities.`, 'DAG Engine');
    } catch (e) {
      addWorkflowLog("Invalid CSV Format. Ensure case_id, activity, dept, duration_hrs exist.", 'Error');
    }
  };

  const loadSample = () => {
    setCsvText(`case_id,activity,dept,duration_hrs
1,Candidate Applied,HR,24
1,HR Review,HR,48
1,Interview Scheduled,HR,72
1,IT Provisioning,IT,120
1,Finance Payroll Setup,Finance,24
2,Candidate Applied,HR,12
2,HR Review,HR,24
2,Offer Rejected,HR,2
3,Candidate Applied,HR,5
3,IT Provisioning,IT,200`);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h1 className="text-2xl font-bold">Workflow Mapping (DAG)</h1>
        <p className="text-muted">Upload process mining CSV data to visualize organizational friction</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/3 flex flex-col gap-4">
          <div className="card flex-1 flex flex-col">
            <h2 className="font-bold mb-4">Upload CSV Data</h2>
            <textarea 
              className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded p-2 text-[var(--text)] font-mono text-xs mb-4"
              placeholder="case_id,activity,dept,duration_hrs..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn bg-surface2 text-text flex-1" onClick={loadSample}>Load Sample</button>
              <button className="btn btn-accent flex-1" onClick={handleProcessCSV}>Process Graph</button>
            </div>
          </div>
        </div>

        <div className="flex-1 card p-0 overflow-hidden flex flex-col bg-black relative" ref={containerRef}>
          {isClient && graphData.nodes.length > 0 ? (
            <ForceGraph2D
              width={containerRef.current?.clientWidth || 800}
              height={containerRef.current?.clientHeight || 600}
              graphData={graphData}
              nodeLabel="id"
              nodeAutoColorBy="dept"
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.id;
                const fontSize = 12/globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = node.color;
                ctx.fillText(label, node.x, node.y);

                node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted">
              Load and process CSV data to view Force DAG visualization
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
