'use client';
import { useRef, useState, useTransition } from 'react';
import { ImageUp, TriangleAlert } from 'lucide-react';
import { addTourImages } from '@/app/admin/(dashboard)/actions';
import { UPLOAD_RULES, batchBySize, scaledDimensions, uploadRulesText, validateUploadFile } from '@/lib/upload';

/** Συρρικνώνει την εικόνα στον browser. Επιστρέφει το αρχικό αρχείο αν
 *  κάτι πάει στραβά — καλύτερα μια μεγάλη φωτογραφία παρά καμία. */
async function shrink(file: File): Promise<File> {
  try {
    // 'from-image' σέβεται το EXIF orientation ώστε οι κάθετες φωτογραφίες
    // κινητού να μη γυρίζουν πλάγια όταν ξαναζωγραφίζονται στο canvas.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, UPLOAD_RULES.maxEdge);
    if (width === bitmap.width && height === bitmap.height && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', UPLOAD_RULES.quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function ImageUploader({ tourId }: { tourId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [pending, startTransition] = useTransition();

  function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const chosen = Array.from(fileList);
    const rejected: { name: string; message: string }[] = [];
    const accepted: File[] = [];
    for (const file of chosen) {
      const check = validateUploadFile(file);
      if (check.ok) accepted.push(file);
      else rejected.push({ name: file.name, message: check.message });
    }
    setErrors(rejected);
    if (accepted.length === 0) {
      setStatus(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    startTransition(async () => {
      setStatus(`Προετοιμασία ${accepted.length} ${accepted.length === 1 ? 'φωτογραφίας' : 'φωτογραφιών'}…`);
      const prepared = await Promise.all(accepted.map(shrink));
      const batches = batchBySize(prepared, UPLOAD_RULES.maxRequestBytes);
      let uploaded = 0;
      const failed: { name: string; message: string }[] = [];

      try {
        for (let i = 0; i < batches.length; i++) {
          setStatus(
            batches.length > 1 ? `Ανέβασμα ${i + 1} από ${batches.length} παρτίδων…` : 'Ανέβασμα…'
          );
          const fd = new FormData();
          for (const file of batches[i]) fd.append('files', file);
          const res = await addTourImages(tourId, fd);
          uploaded += res.uploaded;
          failed.push(...res.failed);
        }
        setErrors((prev) => [...prev, ...failed]);
        setStatus(
          uploaded > 0
            ? `Ανέβηκαν ${uploaded} ${uploaded === 1 ? 'φωτογραφία' : 'φωτογραφίες'}.`
            : 'Δεν ανέβηκε καμία φωτογραφία.'
        );
      } catch {
        setErrors((prev) => [
          ...prev,
          ...failed,
          { name: '—', message: 'Η αποστολή απέτυχε. Δοκιμάστε ξανά με λιγότερες φωτογραφίες τη φορά.' },
        ]);
        setStatus(null);
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted">{uploadRulesText()}</p>
      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(e) => onFiles(e.target.files)}
          className="block text-[14px] text-muted file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-sans file:text-[13px] file:font-semibold file:text-surface disabled:opacity-50"
        />
        <span className="inline-flex items-center gap-2 text-[14px] text-muted">
          <ImageUp className="h-4 w-4" strokeWidth={1.75} />
          {pending ? status : status ?? 'Διαλέξτε φωτογραφίες'}
        </span>
      </div>
      {errors.length > 0 && (
        <ul className="grid gap-1.5 rounded-md border border-cta/30 bg-cta/5 p-3">
          {errors.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-start gap-2 text-[13px] text-cta">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span><strong>{e.name}</strong>, {e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
