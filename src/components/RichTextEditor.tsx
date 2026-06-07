import React, { useState, useRef } from 'react';
import { Bold, Italic, Underline, List, FileCode, Eye, Edit2, Play, Heading, Image as ImageIcon, Sparkles } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  label?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Tulis di sini...', height = 'h-40', label }: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    // Reposition cursor after the operation
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  const insertTemplate = (templateType: 'listening' | 'reading' | 'p') => {
    let before = '';
    let after = '';
    if (templateType === 'listening') {
      before = '<div class="listening-script">\n  <p><b>Narrator:</b> Question number 1 refers to the following conversation.</p>\n  <p><b>Woman:</b> Where are the documents?</p>\n  <p><b>Man:</b> I left them on your desk this morning.</p>\n</div>';
    } else if (templateType === 'reading') {
      before = '<div class="passage-box">\n  <h3><b>Questions 1-3 refer to the following email:</b></h3>\n  <p><b>From:</b> support@company.com<br><b>To:</b> client@domain.com</p>\n  <p>Dear Valued Customer, ...</p>\n</div>';
    } else if (templateType === 'p') {
      before = '<p>';
      after = '</p>';
    }

    if (before) {
      insertTag(before, after);
    }
  };

  return (
    <div className="w-full flex flex-col rounded-2xl border border-white/10 overflow-hidden bg-[#151518] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
        {label && <span className="text-xs font-semibold text-white/50">{label}</span>}
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'write' ? 'bg-[#C2A35F] text-[#0A0A0B] shadow-sm' : 'text-white/40 hover:text-white'}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Tulis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'preview' ? 'bg-[#C2A35F] text-[#0A0A0B] shadow-sm' : 'text-white/40 hover:text-white'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Pratinjau
          </button>
        </div>
      </div>

      {activeTab === 'write' ? (
        <div className="flex flex-col flex-1">
          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => insertTag('<b>', '</b>')}
              title="Tebal (Bold)"
              className="p-1.5 hover:bg-white/5 rounded text-white/70 hover:text-white transition cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<i>', '</i>')}
              title="Miring (Italic)"
              className="p-1.5 hover:bg-white/5 rounded text-white/70 hover:text-white transition cursor-pointer"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<u>', '</u>')}
              title="Garis Bawah (Underline)"
              className="p-1.5 hover:bg-white/5 rounded text-white/70 hover:text-white transition cursor-pointer"
            >
              <Underline className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => insertTag('<h3><b>', '</b></h3>')}
              title="Heading"
              className="p-1.5 hover:bg-white/5 rounded text-white/70 hover:text-white transition cursor-pointer"
            >
              <Heading className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('p')}
              title="Paragraph"
              className="px-2 py-1 hover:bg-white/5 rounded text-xs font-semibold text-white/70 hover:text-white transition cursor-pointer"
            >
              &lt;p&gt;
            </button>
            <button
              type="button"
              onClick={() => insertTag('<ul>\n  <li>', '</li>\n</ul>')}
              title="Daftar Bulat (Bullet List)"
              className="p-1.5 hover:bg-white/5 rounded text-white/70 hover:text-white transition cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-white/10 mx-1" />
            <div className="flex gap-1 ml-auto">
              <button
                type="button"
                onClick={() => insertTemplate('listening')}
                title="Templat Transkrip Listening"
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-purple-500/10 text-purple-300 hover:bg-purple-500/15 rounded-md border border-purple-500/20 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> LISTENING TEMP.
              </button>
              <button
                type="button"
                onClick={() => insertTemplate('reading')}
                title="Templat Passage Reading"
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-[#C2A35F]/10 text-[#C2A35F] hover:bg-[#C2A35F]/15 rounded-md border border-[#C2A35F]/20 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> READING TEMP.
              </button>
            </div>
          </div>
          {/* Main Input Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full p-4 border-0 focus:ring-0 outline-none text-white text-sm font-medium resize-y bg-transparent min-h-[140px] placeholder-white/30 ${height}`}
          />
        </div>
      ) : (
        <div className={`p-4 overflow-y-auto bg-transparent min-h-[140px] max-h-96 ${height}`}>
          {value.trim() ? (
            <div
              className="prose prose-invert max-w-none text-white/90 leading-relaxed text-sm break-words passage-content"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-white/30 text-xs italic">Pratinjau kosong</p>
          )}
        </div>
      )}
    </div>
  );
}
