'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { RoleContext } from './layout';

export default function DashboardIndex() {
  const router = useRouter();
  const { role } = useContext(RoleContext);

  useEffect(() => {
    if (!role) return;
    
    // Redirect logic based on role
    switch (role) {
      case 'Admin':
      case 'Executive':
        router.push('/dashboard/dashboard');
        break;
      case 'HR':
        router.push('/dashboard/hiring');
        break;
      case 'Operations':
        router.push('/dashboard/tasks');
        break;
      case 'IT':
        router.push('/dashboard/it-support');
        break;
      case 'Finance':
        router.push('/dashboard/payroll');
        break;
      case 'Employee':
      default:
        router.push('/dashboard/time-clock');
        break;
    }
  }, [role, router]);

  return <div className="text-muted">Redirecting to your workspace...</div>;
}
