'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { SiteBrand } from '@/components/site-brand';
import { SITE_NAME } from '@/lib/site';
import { SearchBar } from '@/components/search-bar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Menu, Sun, Moon, Globe, User, Download, Settings, ChevronDown, Bell, Shield, Play, Film, Tv, BookOpen, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

const navItems = [
  { name: 'Anime', tab: 'anime', icon: BookOpen, href: '/anime' },
  { name: 'Manga', tab: 'manga', icon: BookOpen, href: '/manga' },
  { name: 'Movies', tab: 'movies', icon: Film, href: '/movies' },
  { name: 'TV Shows', tab: 'tv', icon: Tv, href: '/tv' },
];

const STANDALONE_LINKS = [
  { name: 'Genres', href: '/genre', icon: Shield },
  { name: 'Dubbed', href: '/dub', icon: Globe },
  { name: 'Subbed', href: '/sub', icon: Globe },
  { name: 'Indian Movies', href: '/indian-movies', icon: Film },
  { name: 'Web Series', href: '/indian-series', icon: Tv },
  { name: 'Status', href: '/diagnostics', icon: Shield },
];

const userMenuItems = [
  { label: 'Continue Watching', href: '/continue-watching', icon: Play },
  { label: 'My Downloads', href: '/my-downloads', icon: Download },
  { label: 'Watchlist', href: '/watchlist', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function HeaderNavigation({ isMobile, onLinkClick }: { isMobile?: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('query');

  const getActiveTab = () => {
    if (currentQuery) {
      return searchParams.get('tab') || 'anime';
    }
    if (pathname.startsWith('/anime')) return 'anime';
    if (pathname.startsWith('/manga')) return 'manga';
    if (pathname.startsWith('/movie') || pathname.startsWith('/movies')) return 'movies';
    if (pathname.startsWith('/tv')) return 'tv';
    return searchParams.get('tab') || 'anime';
  };

  const currentTab = getActiveTab();
  const isHomePage = pathname === '/' && !currentQuery;

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-1 pt-4">
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isHomePage && currentTab === item.tab;
          return (
            <Link href={item.href} passHref key={item.tab} onClick={onLinkClick}>
              <Button variant={isActive ? 'default' : 'ghost'} className={cn('w-full justify-start gap-3', isActive && 'bg-primary/10 text-primary')}>
                <Icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Button>
            </Link>
          );
        })}
        <Separator className="my-3" />
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explore</div>
        {STANDALONE_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link href={link.href} passHref key={link.href} onClick={onLinkClick}>
              <Button variant={isActive ? 'default' : 'ghost'} className={cn('w-full justify-start gap-3', isActive && 'bg-primary/10 text-primary')}>
                <Icon className="h-5 w-5 shrink-0" />
                {link.name}
              </Button>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isHomePage && currentTab === item.tab;
        return (
          <Link href={item.href} passHref key={item.tab}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-xl transition-all', isActive && 'bg-primary text-primary-foreground shadow-sm')}
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              {item.name}
            </Button>
          </Link>
        );
      })}
      <Separator className="mx-2 h-6" />
      <div className="flex items-center gap-1">
        {STANDALONE_LINKS.slice(0, 4).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link href={link.href} passHref key={link.href}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="icon"
                      className={cn('h-10 w-10 rounded-xl transition-all', isActive && 'bg-primary text-primary-foreground')}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">{link.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-foreground">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="mb-4">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Link href="/" onClick={() => setOpen(false)}>
              <SiteBrand nameClassName="text-xl" />
            </Link>
          </SheetHeader>
          <Suspense fallback={<div className="w-full h-10" />}>
            <HeaderNavigation isMobile onLinkClick={() => setOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  if (!mounted) return <Button variant="ghost" size="icon" className="h-10 w-10"><Sun className="h-5 w-5" /></Button>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl text-foreground hover:bg-accent"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  ];
  const [currentLang, setCurrentLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang');
    if (saved) setCurrentLang(saved);
  }, []);

  const selectLang = (code: string) => {
    setCurrentLang(code);
    localStorage.setItem('preferred_lang', code);
    setOpen(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-foreground hover:bg-accent"
                onClick={() => setOpen(!open)}
                aria-label="Select Language"
              >
                <Globe className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">Language</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 min-w-[180px] p-2">
        <DropdownMenuLabel className="px-2 py-1 font-semibold text-sm">Audio Language</DropdownMenuLabel>
        <Separator className="my-1" />
        <ScrollArea className="max-h-64">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              className={cn('flex items-center gap-3 px-2 py-2', currentLang === lang.code && 'bg-primary/10 text-primary')}
              onSelect={() => selectLang(lang.code)}
              onClick={() => selectLang(lang.code)}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-sm">{lang.name}</span>
              {currentLang === lang.code && <Shield className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-foreground hover:bg-accent" aria-label="User Menu">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/logo.png" alt={SITE_NAME} />
                  <AvatarFallback className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">Account</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-[220px] p-2">
        <DropdownMenuLabel className="px-2 py-1 font-semibold text-sm">{SITE_NAME}</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {userMenuItems.map((item) => (
          <DropdownMenuItem key={item.label} className="flex items-center gap-3 px-2 py-2" onClick={() => {}}>
            <item.icon className="h-4 w-4" />
            <span className="text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 text-destructive" onClick={() => {}}>
          <Shield className="h-4 w-4" />
          <span className="text-sm">Report Issue</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b transition-all duration-300',
      scrolled
        ? 'border-slate-200/80 bg-white/95 backdrop-blur-lg shadow-sm'
        : 'border-transparent bg-white/80 backdrop-blur-md'
    )}>
      <div className="container flex h-16 max-w-7xl items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-2 md:mr-6" aria-label={`${SITE_NAME} - Home`}>
            <SiteBrand />
          </Link>
          <Suspense fallback={<div className="w-48 h-10" />}>
            <HeaderNavigation />
          </Suspense>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-1">
          <div className="w-full flex-1 md:w-auto md:flex-none hidden sm:block">
            <SearchBar />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
            <UserMenu />
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}