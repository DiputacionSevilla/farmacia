import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-xl font-bold text-brand-blue-900">
        Acceso administrativo
      </h1>
      <p className="mt-1 text-sm text-brand-blue-700">
        Farmacias de guardia — Ayuntamiento de Mairena del Alcor
      </p>
      <LoginForm next={next && next.startsWith("/admin") ? next : "/admin"} />
    </div>
  );
}
