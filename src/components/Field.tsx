type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

/**
 * حقل نصي موحّد (تسمية + إدخال) بنفس نمط التصميم المستخدم في كل نماذج
 * المنصة (العملاء، العقارات، العقود، الفواتير، المهام، تسجيل الدخول...).
 */
export function Field({ label, value, onChange, type = "text", placeholder, required }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-navy">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
      />
    </div>
  );
}
