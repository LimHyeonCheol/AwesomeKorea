import { useAppRoute } from "./hooks/useAppRoute";
import { ContentPage } from "./pages/ContentPage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const { route, openContent, openHome } = useAppRoute();

  if (route.kind === "content") {
    return (
      <ContentPage
        contentSlug={route.contentSlug}
        onNavigateHome={openHome}
      />
    );
  }

  return (
    <HomePage
      homeAnchor={route.anchor}
      initialSort={route.sort}
      onOpenContent={openContent}
    />
  );
}
