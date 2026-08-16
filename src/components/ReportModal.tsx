import React, { useEffect, useState } from 'react';
import { Garden } from '../types';
import { BrutalSelect } from './BrutalSelect';

const ROLES = [
  'Garden Steward',
  'Neighbor',
  'Community Board Member',
  'Volunteer',
  'Concerned Citizen',
] as const;

type ReporterRole = (typeof ROLES)[number];

const fieldLabel = 'block font-medium text-[#3f3f3f] text-[15px] tracking-[-0.03em] mb-2';
const textField =
  'w-full bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] px-4 py-2.5 font-normal text-[#3f3f3f] text-[16px] tracking-[-0.03em] placeholder:text-[#3f3f3f]/45 focus:outline-none';
const ghostButton =
  'nb-press px-5 py-2 bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] font-medium text-[#3f3f3f] text-[16px] tracking-[-0.03em] cursor-pointer';
const primaryButton =
  'nb-press px-5 py-2 bg-[#306a4e] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] font-medium text-[#fbf7ff] text-[16px] tracking-[-0.03em] cursor-pointer disabled:opacity-50';

export const ReportModal: React.FC<{
  open: boolean;
  gardens: Garden[];
  initialGardenId?: string;
  onClose: () => void;
}> = ({ open, gardens, initialGardenId, onClose }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<ReporterRole>('Neighbor');
  const [gardenId, setGardenId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const sortedGardens = [...gardens].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!open) return;
    setName('');
    setRole('Neighbor');
    setGardenId(initialGardenId || '');
    setTitle('');
    setDescription('');
    setSubmitting(false);
    setSubmitted(false);
    setError('');
  }, [open, initialGardenId]);

  useEffect(() => {
    if (!open || gardenId) return;
    const next = initialGardenId || sortedGardens[0]?.id;
    if (next) setGardenId(next);
  }, [open, gardenId, initialGardenId, gardens]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!gardenId || !title.trim() || !description.trim()) {
      setError('Please fill in garden, title, and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/gardens/${encodeURIComponent(gardenId)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterName: name.trim() || undefined,
          reporterRole: role,
          threatCategory: 'Other Threat Alert',
          title: title.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit report');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center px-4 py-8 bg-[#3f3f3f]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[20px] shadow-[6px_6px_0_0_#3f3f3f] font-[Inter,sans-serif] text-[#3f3f3f]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div className="bg-[#306a4e] rounded-t-[18px] px-6 py-4">
          <h2
            id="report-modal-title"
            className="font-medium text-[#fbf7ff] text-[20px] tracking-[-0.05em]"
          >
            {submitted ? 'Report submitted' : 'Know Something We Don’t?'}
          </h2>
        </div>

        {submitted ? (
          <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="size-14 rounded-full border-2 border-[#3f3f3f] bg-[#306a4e] text-[#fbf7ff] flex items-center justify-center shadow-[4px_4px_0_0_#3f3f3f]">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
                <path
                  d="M5 12.5l4.2 4.2L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-medium text-[18px] tracking-[-0.03em]">Thanks for the report.</p>
            <p className="font-normal text-[15px] tracking-[-0.03em] text-[#3f3f3f]/70 max-w-[22rem]">
              Your note helps keep this garden’s record current. Neighbors can keep watching from here.
            </p>
            <button type="button" onClick={onClose} className={`${primaryButton} mt-2 min-w-[120px]`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label htmlFor="report-name" className={fieldLabel}>
                Your name <span className="font-normal text-[#3f3f3f]/55">(optional)</span>
              </label>
              <input
                id="report-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={textField}
              />
            </div>

            <div>
              <span className={fieldLabel}>Role</span>
              <BrutalSelect
                ariaLabel="Role"
                value={role}
                onChange={(next) => setRole(next as ReporterRole)}
                fullWidth
                className="px-4 py-2.5 text-[16px] tracking-[-0.03em]"
                options={ROLES.map((option) => ({ value: option, label: option }))}
              />
            </div>

            <div>
              <span className={fieldLabel}>Garden name</span>
              <BrutalSelect
                ariaLabel="Garden name"
                value={gardenId}
                onChange={setGardenId}
                fullWidth
                className="px-4 py-2.5 text-[16px] tracking-[-0.03em]"
                menuClassName="max-h-48"
                options={
                  sortedGardens.length === 0
                    ? [{ value: '', label: 'Loading gardens…' }]
                    : sortedGardens.map((garden) => ({ value: garden.id, label: garden.name }))
                }
              />
            </div>

            <div>
              <label htmlFor="report-title" className={fieldLabel}>
                Title
              </label>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Surveyors on the lot this morning"
                required
                className={textField}
              />
            </div>

            <div>
              <label htmlFor="report-description" className={fieldLabel}>
                Description
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you see or hear, and when?"
                required
                rows={4}
                className={`${textField} resize-y min-h-[96px]`}
              />
            </div>

            {error && (
              <p className="font-medium text-[14px] text-[#b32d2d] tracking-[-0.03em]">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 pb-1">
              <button type="button" onClick={onClose} className={ghostButton}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
