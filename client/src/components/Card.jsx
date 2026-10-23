export default function Card({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </Tag>
  );
}