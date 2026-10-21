import { useColorScheme } from 'react-native';

export const palettes = {
  light: {
    background: '#F6F4EF', surface: '#FFFEFB', text: '#24312A', secondary: '#707A72',
    action: '#285B47', actionText: '#FFFFFF', highlight: '#F4D980', border: '#E7E4DC',
    danger: '#A33F36', subtle: '#EDEAE2',
  },
  dark: {
    background: '#111915', surface: '#1B241F', text: '#EDF1EB', secondary: '#A8B4AA',
    action: '#A6D3B8', actionText: '#17231B', highlight: '#806B30', border: '#344039',
    danger: '#6D302B', subtle: '#27312B',
  },
} as const;

export type Palette = { [Key in keyof (typeof palettes)['light']]: string };

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? palettes.dark : palettes.light;
}
