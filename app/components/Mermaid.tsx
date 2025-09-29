'use client';

import React, { useEffect, useRef } from 'react';
import type mermaidType from 'mermaid';

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const element = ref.current;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default as typeof mermaidType;
        if (!mounted || !element || !chart) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#f8fafc',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#e2e8f0',
            lineColor: '#94a3b8',
            background: '#ffffff',
            mainBkg: '#ffffff',
          },
        });

        const id = `m-${uuid()}`;
        const { svg } = await mermaid.render(id, chart);
        if (element) element.innerHTML = svg;
      } catch {
        if (element) {
          element.innerHTML =
            '<p class="text-slate-400 text-sm p-3">Could not render diagram.</p>';
        }
      }
    })();

    return () => {
      mounted = false;
      // Use stored element variable in cleanup to avoid ref.current warning
      if (element) {
        element.innerHTML = '';
      }
    };
  }, [chart]);

  return <div ref={ref} className="[&>svg]:w-full [&>svg]:h-auto text-slate-800" />;
}