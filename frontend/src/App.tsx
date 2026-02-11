import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserStore } from '@/store/userStore';
import HomePage from '@/components/pages/HomePage';
import ProfilePage from '@/components/pages/ProfilePage';
import CategoryPage from '@/components/pages/CategoryPage';
import AmountInputPage from '@/components/pages/AmountInputPage';
import PremiumPage from '@/components/pages/PremiumPage';
import SettingsPage from '@/components/pages/SettingsPage';
import Layout from '@/components/layout/Layout';

function App() {
  const { webApp, user } = useTelegram();
  const { setUser, fetchUser } = useUserStore();

  useEffect(() => {
    // Initialize Telegram WebApp
    if (webApp) {
      webApp.ready();
      webApp.expand();
      
      // Set color scheme
      document.documentElement.style.setProperty(
        '--tg-theme-bg-color',
        webApp.themeParams.bg_color || '#ffffff'
      );
    }
  }, [webApp]);

  useEffect(() => {
    // Set user from Telegram
    if (user) {
      setUser({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        languageCode: user.language_code,
        isPremium: user.is_premium,
      });
      
      // Fetch user data from backend
      fetchUser();
    }
  }, [user, setUser, fetchUser]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/expense/category" element={<CategoryPage />} />
        <Route path="/expense/amount" element={<AmountInputPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
