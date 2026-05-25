import type { Config } from "tailwindcss";
import animate from 'tailwindcss-animate';

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			backgroundImage: {
				'gradient-unified': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'gradient-white-green': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'gradient-white-green-light': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'gradient-white-green-dark': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'gradient-green-white': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'gradient-subtle-green': 'linear-gradient(135deg, #ffffff 0%, #f8faf7 20%, #f3f9f0 40%, #eff7ed 60%, #e8f5e9 80%, #f0f9ee 100%)',
				'grid-pattern': 'linear-gradient(to right, #86efac 1px, transparent 1px), linear-gradient(to bottom, #86efac 1px, transparent 1px)',
			},
			backgroundSize: {
				'grid-pattern': '40px 40px',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [animate],
} satisfies Config;
