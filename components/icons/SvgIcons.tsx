import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface IconProps {
  size?: number;
  color?: string;
}

// Icône Navbar (hamburger menu)
export function NavbarIcon({ size = 24, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size * 0.76} viewBox="0 0 25 19" fill="none">
      <Path 
        d="M0.249025 2.09741C0.249025 1.54741 0.510426 1.07675 1.03323 0.685412C1.55603 0.294079 2.18526 0.0980788 2.92093 0.0974121L21.6242 0.0974121C22.359 0.0974121 22.9878 0.293412 23.5106 0.685412C24.0334 1.07741 24.2953 1.54808 24.2961 2.09741V16.0974C24.2961 16.6474 24.0343 17.1184 23.5106 17.5104C22.9869 17.9024 22.3581 18.0981 21.6242 18.0974H2.92093C2.18615 18.0974 1.55692 17.9017 1.03323 17.5104C0.509535 17.1191 0.248135 16.6481 0.249025 16.0974V2.09741ZM9.26473 2.09741C8.71245 2.09741 8.26473 2.54513 8.26473 3.09741V15.0974C8.26473 15.6497 8.71245 16.0974 9.26473 16.0974H20.6242C21.1765 16.0974 21.6242 15.6497 21.6242 15.0974V3.09741C21.6242 2.54513 21.1765 2.09741 20.6242 2.09741L9.26473 2.09741ZM5.59283 3.09741C5.59283 2.54513 5.14511 2.09741 4.59283 2.09741H3.92093C3.36864 2.09741 2.92093 2.54513 2.92093 3.09741V15.0974C2.92093 15.6497 3.36864 16.0974 3.92093 16.0974H4.59283C5.14511 16.0974 5.59283 15.6497 5.59283 15.0974V3.09741Z" 
        fill={iconColor}
      />
    </Svg>
  );
}

// Icône Send (flèche vers le haut)
export function SendIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size * 0.82} height={size} viewBox="0 0 14 17" fill="none">
      <Path 
        d="M7 1.81372V15.8137M7 1.81372L13 7.81372M7 1.81372L1 7.81372" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône Trombone (attachment)
export function TromboneIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M13.234 20.252L21 12.3M16 6L7.58599 14.586C7.21105 14.9611 7.00042 15.4697 7.00042 16C7.00042 16.5303 7.21105 17.0389 7.58599 17.414C7.96104 17.7889 8.46966 17.9996 8.99999 17.9996C9.53032 17.9996 10.0389 17.7889 10.414 17.414L18.828 8.828C19.5779 8.07789 19.9991 7.06066 19.9991 6C19.9991 4.93934 19.5779 3.92211 18.828 3.172C18.0779 2.42212 17.0606 2.00085 16 2.00085C14.9393 2.00085 13.9221 2.42212 13.172 3.172L4.75699 11.757C3.63168 12.8823 2.99948 14.4086 2.99948 16C2.99948 17.5914 3.63168 19.1177 4.75699 20.243C5.8823 21.3683 7.40856 22.0005 8.99999 22.0005C10.5914 22.0005 12.1177 21.3683 13.243 20.243" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône Home (maison)
export function HomeIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M9 22V12H15V22" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône User (utilisateur)
export function UserIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône History (historique)
export function HistoryIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M12 8V12L16 16" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône Image
export function ImageIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M21 15L16 10L5 21" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône Tools (outils)
export function ToolsIcon({ size = 20, color }: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M14.7 6.3C14.7 6.3 15.6 3.1 14.1 1.5C12.6 -0.1 9.4 0.9 9.4 0.9L12.7 4.2L10.5 6.4L7.2 3.1C7.2 3.1 6.2 6.3 7.8 7.8C9.4 9.4 12.6 8.4 12.6 8.4L17.8 13.6C18.3 14.1 18.3 14.9 17.8 15.4L15.4 17.8C14.9 18.3 14.1 18.3 13.6 17.8L8.4 12.6C8.4 12.6 5.2 13.6 3.6 12C2 10.4 3 7.2 3 7.2L6.3 10.5L8.5 8.3L5.2 5C5.2 5 8.4 4 10 5.6C11.6 7.2 10.6 10.4 10.6 10.4L14.7 6.3Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
} 