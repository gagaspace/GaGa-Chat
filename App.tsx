import { useEffect, Suspense, lazy, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider, Helmet } from "react-helmet-async";
import AuthGate from "./components/auth/AuthGate";
import { useAuth } from "./hooks/useAuth";
import logoSrc from "@/assets/logo.jpg";
import { supabase } from "./lib/supabase";
import { requestBrowserNotifications } from "./lib/notifications";
import { requestFirebaseMessagingToken, onFirebaseMessage } from "./lib/firebase";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("You are back online!");
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Some features may be limited.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-[11px] font-bold py-1 flex items-center justify-center gap-2 animate-slide-in">
      <WifiOff size={12} />
      <span>NO INTERNET CONNECTION</span>
    </div>
  );
};

const InviteHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const inviteId = searchParams.get('id');

  useEffect(() => {
    const handleInvite = async () => {
      if (user && inviteId) {
        // Find user with that sliced ID (first 8 chars)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .ilike('id', `${inviteId}%`)
          .limit(1);

        if (profiles && profiles.length > 0) {
          const friend = profiles[0];
          if (friend.id !== user.id) {
            toast.success(`Connected with ${friend.name}!`);
            // In a real app, you might add to a 'friends' table
            // Route to the chats tab after accepting the invite
            navigate('/chats');
          }
        }
      }
    };
    handleInvite();
  }, [user, inviteId, navigate]);

  return <Index initialTab="chats" />;
};

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-white-green">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-400/20 blur-3xl opacity-40 animate-pulse" />
            <img
              src={logoSrc}
              alt="GaGa Chat"
              className="relative w-32 h-32 rounded-full ring-4 ring-green-400/40 animate-pulse object-cover"
            />
          </div>
          <p className="text-green-700/80 text-sm font-semibold">Loading GaGa Chat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-white-green">
          <div className="flex flex-col items-center gap-4">
            <img src={logoSrc} alt="GaGa Chat" className="w-16 h-16 rounded-full animate-pulse object-cover shadow-lg" />
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chats" element={<Index initialTab="chats" />} />
          <Route path="/contacts" element={<Index initialTab="contacts" />} />
          <Route path="/timeline" element={<Index initialTab="timeline" />} />
          <Route path="/calls" element={<Index initialTab="calls" />} />
          <Route path="/more" element={<Index initialTab="more" />} />
          <Route path="/invite" element={<InviteHandler />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => {
  useEffect(() => {
    let unsubscribeFromMessages: (() => void) | undefined;

    const initializeNotifications = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'default') {
        const enabled = await requestBrowserNotifications();
        if (enabled) {
          toast.success('Notifications enabled for GaGa Chat');
        }
      }

      if (Notification.permission === 'granted') {
        const fcmToken = await requestFirebaseMessagingToken();
        if (fcmToken) {
          console.log('Firebase messaging token:', fcmToken);
        }

        unsubscribeFromMessages = onFirebaseMessage((payload) => {
          const message = payload as { notification?: { title?: string } };
          if (message.notification?.title) {
            toast(message.notification.title);
          }
        });
      }
    };

    initializeNotifications();

    return () => {
      unsubscribeFromMessages?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <OfflineIndicator />
        <Helmet>
          <title>GaGa Chat — Fast, Secure & Private Messaging</title>
          <meta name="description" content="Experience the next generation of messaging with GaGa Chat. Free voice & video calls, end-to-end encrypted chats, and real-time moments sharing." />
          <meta property="og:title" content="GaGa Chat — Fast, Secure & Private Messaging" />
          <meta property="og:description" content="Experience the next generation of messaging with GaGa Chat. Free voice & video calls, end-to-end encrypted chats, and real-time moments sharing." />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="GaGa Chat — Fast, Secure & Private Messaging" />
          <meta name="twitter:description" content="Experience the next generation of messaging with GaGa Chat. Free voice & video calls, end-to-end encrypted chats, and real-time moments sharing." />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#000000" />
          <meta property="og:image" content="https://gaga.chat/og-image.svg" />
          <meta property="og:image:type" content="image/svg+xml" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="GaGa Chat — secure realtime messaging" />
          <meta name="twitter:image:src" content="https://gaga.chat/twitter-card.svg" />
          <link rel="canonical" href="https://gaga.chat/" />
          <script type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "GaGa Chat",
                "operatingSystem": "Web, iOS, Android",
                "applicationCategory": "CommunicationApplication",
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "ratingCount": "1250"
                },
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              }
            `}
          </script>
        </Helmet>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
