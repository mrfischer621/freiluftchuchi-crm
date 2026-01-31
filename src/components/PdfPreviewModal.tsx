import { X, Download } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlobUrl: string | null;
  onDownload: () => void;
  title: string;
  fileName: string;
}

/**
 * Modal zur Vorschau von PDF-Dokumenten
 * Zeigt das PDF in einem iframe an und bietet Download-Option
 */
export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfBlobUrl,
  onDownload,
  title,
  fileName,
}: PdfPreviewModalProps) {
  if (!isOpen || !pdfBlobUrl) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* PDF Viewer */}
          <div className="p-4 bg-gray-100">
            <iframe
              src={pdfBlobUrl}
              className="w-full h-[70vh] rounded-lg border border-gray-200 bg-white"
              title={`PDF Vorschau: ${fileName}`}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Schliessen
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
            >
              <Download size={18} />
              Herunterladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
