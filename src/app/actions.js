'use server';

import natural from 'natural';

export async function analyzeSentimentAction(feedbackText) {
  const Analyzer = natural.SentimentAnalyzer;
  const stemmer = natural.PorterStemmer;
  const analyzer = new Analyzer("English", stemmer, "afinn");
  
  const tokenizer = new natural.WordTokenizer();
  const tokenized = tokenizer.tokenize(feedbackText);
  
  const score = analyzer.getSentiment(tokenized);
  return score;
}
