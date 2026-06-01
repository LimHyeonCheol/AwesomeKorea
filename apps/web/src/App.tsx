import { useAppRoute } from "./hooks/useAppRoute";
import { AdminPage } from "./pages/AdminPage";
import { ContentPage } from "./pages/ContentPage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const { route, openAdmin, openContent, openHome } = useAppRoute();

  if (route.kind === "content") {
    return (
      <ContentPage
        contentSlug={route.contentSlug}
        onNavigateHome={openHome}
      />
    );
  }

  if (route.kind === "admin") {
    return <AdminPage onNavigateHome={openHome} />;
  }

  return (
    <HomePage
      homeAnchor={route.anchor}
      initialSort={route.sort}
      onOpenAdmin={openAdmin}
      onOpenContent={openContent}
    />
  );
}
