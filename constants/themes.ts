export interface Theme {
  name: 'dark' | 'light';
  backgrounds: {
    primary: string;
    secondary: string;
    tertiary: string;
    chatInput: string;
    userMessage: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  borders: {
    primary: string;
    chatHeader: string;
    sidebar: string;
    chatInput?: string;
  };
}

export const DARK_THEME: Theme = {
  name: 'dark',
  backgrounds: {
    primary: '#222422',      // Couleur unifiée pour tout l'arrière-plan
    secondary: '#222422',    // Même couleur pour uniformiser
    tertiary: '#2a2c2a',     // Légèrement plus clair pour les cartes
    chatInput: '#303030',    // Couleur spécifique chat input
    userMessage: '#303030',  // Bulles utilisateur
  },
  text: {
    primary: '#ffffff',      // --color-text-primary
    secondary: '#d1d5db',    // --color-text-secondary
  },
  borders: {
    primary: '#1f211f',      // --color-border
    chatHeader: 'rgba(247, 242, 242, 0.1)',
    sidebar: 'rgba(247, 242, 242, 0.1)',
  }
};

export const LIGHT_THEME: Theme = {
  name: 'light',
  backgrounds: {
    primary: '#ffffff',      // --color-bg-primary
    secondary: '#f7f2f2',    // --color-bg-secondary
    tertiary: '#f3f4f6',     // --color-bg-tertiary
    chatInput: '#ffffff',    // Couleur spécifique chat input
    userMessage: '#5A5A5A',  // Bulles utilisateur (gris sobre)
  },
  text: {
    primary: '#111827',      // --color-text-primary
    secondary: '#374151',    // --color-text-secondary
  },
  borders: {
    primary: '#e5e7eb',      // --color-border
    chatHeader: 'rgba(247, 242, 242, 0.1)',
    sidebar: 'rgba(247, 242, 242, 0.1)',
    chatInput: 'rgba(34, 37, 34, 0.2)',
  }
};

export const SUBSCRIPTION_PLANS = {
  ESSENTIEL: {
    price: '14,99€',
    color: '#3b82f6', // Bleu
  },
  PERFORMANCE: {
    price: '29,99€', 
    color: '#8b5cf6', // Violet (populaire)
  },
  PROFESSIONNEL: {
    price: '49,99€',
    color: '#10b981', // Vert
  }
}; 