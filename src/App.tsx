/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage, UserProfile } from './pages/LoginPage.js';
import { Dashboard } from './pages/Dashboard.js';

export type AppView = 'landing' | 'login' | 'app';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('app') || hash.includes('generator')) return 'app';
      if (hash.includes('login') || hash.includes('signin')) return 'login';
    }
    return 'landing';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Default demo profile for quick operational testing
    return {
      name: 'Alex Turner',
      email: 'alex.turner@enterprise-ops.io',
      role: 'Lead Operations Engineer',
      team: 'Platform Reliability (Tier 1)',
    };
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('app') || hash.includes('generator')) {
        setCurrentView('app');
      } else if (hash.includes('login') || hash.includes('signin')) {
        setCurrentView('login');
      } else if (hash === '#landing' || hash === '#home') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: AppView, newHash?: string) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (newHash !== undefined) {
        window.location.hash = newHash;
      }
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    navigateTo('app', '#app');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigateTo('landing', '');
  };

  if (currentView === 'login') {
    return (
      <LoginPage
        onBackToLanding={() => navigateTo('landing', '')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'app') {
    return (
      <Dashboard
        onNavigateToLanding={() => navigateTo('landing', '')}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <LandingPage
      onSignIn={() => navigateTo('login', '#login')}
      onGetStarted={() => navigateTo('login', '#login')}
      onOpenApp={() => navigateTo('app', '#app')}
    />
  );
}
