export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-forest-600 hover:bg-forest-700 text-white',
    secondary: 'bg-forest-50 hover:bg-forest-100 text-forest-700',
    ghost: 'bg-transparent hover:bg-ink-400/10 text-ink-600',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}