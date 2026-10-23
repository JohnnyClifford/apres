export default function Hero({ eyebrow, title, children }) {
  return (
    <div className="bg-gradient-to-br from-forest-600 to-forest-900 text-white rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-20px_rgba(30,95,79,0.5)]">
      {eyebrow && (
        <p className="uppercase text-xs tracking-[0.2em] text-forest-100/80 mb-3 font-medium">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-4xl md:text-5xl leading-tight">{title}</h1>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}