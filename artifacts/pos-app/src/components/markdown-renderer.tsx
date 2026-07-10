import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Check, Copy } from "lucide-react";

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono">{language || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm bg-slate-950 dark:bg-black text-slate-100 leading-relaxed m-0">
        <code className="hljs">{code}</code>
      </pre>
    </div>
  );
}

// Badge renderer — detects ALL-CAPS status words in text
function InlineBadge({ text }: { text: string }) {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    SELESAI: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    GAGAL: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    RUNNING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    BERJALAN: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    WAITING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    MENUNGGU: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    DEGRADED: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    DEGRADASI: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[text.toUpperCase()] || "bg-slate-100 text-slate-600"}`}>{text}</span>;
}

// Custom paragraph renderer to handle inline status badges
function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-[16px] leading-[1.8] mb-[18px]">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

const components: Partial<Components> = {
  p: Paragraph,
  strong: Strong,
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    if (match) {
      return <CodeBlock language={match[1]} code={code} />;
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#E11D48] dark:text-[#FB7185] text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">{children}</thead>;
  },
  th({ children }) {
    return <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">{children}</th>;
  },
  td({ children }) {
    return <td className="px-4 py-2 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">{children}</td>;
  },
  img({ src, alt }) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="block my-4">
        <img src={src} alt={alt || ""} className="max-w-full rounded-xl hover:opacity-90 transition-opacity" loading="lazy" />
      </a>
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#1565FF] hover:underline">
        {children}
      </a>
    );
  },
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <article
      className="prose prose-slate dark:prose-invert max-w-none
        prose-h1:text-[32px] prose-h1:font-bold prose-h1:mt-10 prose-h1:mb-4 prose-h1:tracking-tight
        prose-h2:text-[24px] prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3 prose-h2:tracking-tight
        prose-h3:text-[20px] prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-2
        prose-h4:text-[17px] prose-h4:font-medium prose-h4:mt-5 prose-h4:mb-2
        prose-p:text-[16px] prose-p:leading-[1.8] prose-p:mb-[18px]
        prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6
        prose-ol:my-2 prose-ol:pl-6
        prose-li:text-[16px] prose-li:leading-[1.8] prose-li:mb-1
        prose-code:text-sm prose-code:font-mono
        prose-pre:bg-transparent prose-pre:p-0
        prose-blockquote:border-l-4 prose-blockquote:border-[#1565FF] prose-blockquote:pl-4 prose-blockquote:italic
        prose-hr:border-slate-200 dark:prose-hr:border-slate-700
        prose-strong:font-semibold
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
