'use client';

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  itemId: string;
  itemName?: string;
  confirmMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function DeleteButton({
  action,
  itemId,
  itemName,
  confirmMessage,
  className = 'px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200',
  children = 'Delete',
}: DeleteButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const message = confirmMessage || `Delete ${itemName || 'this item'}?`;
    if (!confirm(message)) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={itemId} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
