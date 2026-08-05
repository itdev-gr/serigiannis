/** Αναζήτηση λίστας admin. Υποβάλλει με GET στην ίδια σελίδα, ώστε το
 *  φιλτράρισμα να γίνεται στον server και το αποτέλεσμα να μοιράζεται ως link. */
export function AdminSearch({
  action,
  placeholder,
  defaultValue,
  hidden,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  /** Παράμετροι που πρέπει να επιβιώσουν της αναζήτησης (π.χ. ενεργό φίλτρο). */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="ml-auto">
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null
      )}
      <input
        name="q"
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
      />
    </form>
  );
}
