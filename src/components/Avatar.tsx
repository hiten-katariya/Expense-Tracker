import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeAvatarProps {
  src?: string | null;
  className?: string;
  iconClassName?: string;
}

export function SafeAvatar({ src, className = 'h-10 w-10', iconClassName }: SafeAvatarProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (src && !error) {
    return (
      <img
        src={src}
        alt="User avatar"
        className={cn('object-cover rounded-full', className)}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 border border-primary-500/20',
        className
      )}
    >
      <User className={cn('h-1/2 w-1/2 text-primary-500', iconClassName)} />
    </div>
  );
}
