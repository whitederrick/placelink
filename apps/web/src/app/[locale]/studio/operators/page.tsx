import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { listStudioOperators } from "@/features/studio-operations";
import { OperatorRoleAction } from "@/features/studio-operations/components/OperatorRoleAction";
import { isLocale } from "@/i18n/config";
import { hasStudioPermission } from "@/lib/auth/permissions";

export default async function StudioOperatorsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}>) {
  const [{ locale }, query, session, t] = await Promise.all([
    params,
    searchParams,
    auth(),
    getTranslations("studioOperators"),
  ]);
  if (!isLocale(locale)) notFound();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  if (!actor || !hasStudioPermission(actor, "studio.roles.manage")) notFound();
  const result = await listStudioOperators(actor, query);
  const labels = {
    role: t("role"),
    reason: t("reason"),
    save: t("save"),
    saving: t("saving"),
    saved: t("saved"),
    error: t("error"),
    none: t("none"),
    roles: {
      SUPER_ADMIN: t("roles.superAdmin"),
      SUPPORT: t("roles.support"),
      CONTENT: t("roles.content"),
      ANALYST: t("roles.analyst"),
    },
  };
  return (
    <div className="studio-page">
      <header className="studio-page-heading">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </header>
      <form className="studio-filter-bar">
        <label>
          {t("searchLabel")}
          <input
            defaultValue={query.search}
            name="search"
            placeholder={t("searchPlaceholder")}
          />
        </label>
        <button className="button ghost" type="submit">
          {t("search")}
        </button>
      </form>
      <section className="studio-record-table">
        {result.data.length ? (
          result.data.map((operator) => (
            <article className="studio-panel" key={operator.id}>
              <div>
                <strong>{operator.nickname}</strong>
                <small>{operator.email ?? operator.id}</small>
              </div>
              {operator.id === actor.id ? (
                <p>{t("selfProtected")}</p>
              ) : (
                <OperatorRoleAction operator={operator} labels={labels} />
              )}
            </article>
          ))
        ) : (
          <p className="studio-empty">{t("empty")}</p>
        )}
      </section>
    </div>
  );
}
