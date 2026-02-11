import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl p-4 bg-tg-secondary-bg ${className}`}>
      {children}
    </div>
  );
}

export default Card;
