import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, Bell, Image, MessageSquare, Phone, BookImage, Users, Globe,
    Bot, FlaskConical, Shield, Lock, Database, QrCode, ArrowRightLeft, Smile,
    Palette, Coins, UserCircle, Search, X, Settings, LogOut, Moon, Sun, Camera, Loader2, Check,
    QrCode as ScanIcon, ShieldCheck, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logoSrc from '@/assets/logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { useChatStore } from '@/hooks/useChatStore';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import QRScannerPage from './QRScannerPage';

interface AppUser {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'busy';
    statusMessage: string;
    phone?: string;
}

interface SettingsSubPageProps {
    title: string;
    onBack: () => void;
    children: React.ReactNode;
}

const SettingsSubPage = ({ title, onBack, children }: SettingsSubPageProps) => (
    <div className="flex flex-col h-full bg-black">
        <div className="px-4 pt-12 pb-4 flex items-center gap-3">
            <button onClick={onBack} className="text-white p-1">
                <ChevronRight size={22} className="rotate-180 text-white" />
            </button>
            <h1 className="text-white text-xl font-bold">{title}</h1>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
    </div>
);

interface SettingsRowProps {
    icon?: React.ReactNode;
    label: string;
    description?: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (val: boolean) => void;
}

const SettingsRow = ({
    icon,
    label,
    description,
    value,
    onPress,
    showArrow = true,
    danger = false,
    toggle,
    toggleValue,
    onToggle,
}: SettingsRowProps) => (
    <button
        className={cn(
            "w-full flex items-center justify-between px-5 py-4 active:bg-green-300/10 transition-colors text-left",
            danger && "text-red-500"
        )}
        onClick={toggle ? () => onToggle?.(!toggleValue) : onPress}
    >
        <div className="flex items-center gap-4 flex-1 min-w-0">
            {icon && (
                <div className={cn("flex-shrink-0 w-6 flex items-center justify-center text-green-700/80", danger && "text-red-500")}>
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className={cn("text-[15px]", danger ? "text-red-500" : "text-white")}>{label}</p>
                {description && <p className="text-[13px] text-green-700/40 mt-0.5 leading-tight">{description}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-green-700/40 text-[15px]">{value}</span>}
            {toggle ? (
                <div
                    onClick={(e) => { e.stopPropagation(); onToggle?.(!toggleValue); }}
                    className={cn(
                        "w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0",
                        toggleValue ? "bg-green-500" : "bg-green-300/20"
                    )}
                >
                    <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                        toggleValue ? "translate-x-6" : "translate-x-1"
                    )} />
                </div>
            ) : showArrow ? (
                <ChevronRight size={18} className={cn("flex-shrink-0", danger ? "text-red-500/50" : "text-green-300/20")} />
            ) : null}
        </div>
    </button>
);

const SectionDivider = ({ label }: { label: string }) => (
    <div className="px-5 pt-6 pb-2">
        <p className="text-[13px] text-green-700/40">{label}</p>
    </div>
);

const Separator = () => <div className="h-px bg-green-300/20 mx-5" />;

const StorageSettings = ({ onBack }: { onBack: () => void }) => {
    const handleClearCache = async () => {
        if (confirm('This will clear temporary app data. Continue?')) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            toast.success('App cache cleared');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    return (
        <SettingsSubPage title="Storage" onBack={onBack}>
            <SectionDivider label="Usage" />
            <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                <SettingsRow label="Clear app cache" description="Free up space by removing cached assets." onPress={handleClearCache} />
            </div>
        </SettingsSubPage>
    );
};

const ProfileEditModal = ({ onClose, currentProfile, onUpdate }: { onClose: () => void, currentProfile: AppUser | null, onUpdate: () => void }) => {
    const { user } = useAuth();
    const [name, setName] = useState(currentProfile?.name || '');
    const [status, setStatus] = useState(currentProfile?.statusMessage || '');
    const [avatar, setAvatar] = useState(currentProfile?.avatar || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const url = await uploadFile('profiles', file);
            setAvatar(url);
            toast.success('Avatar uploaded!');
        } catch (err) {
            toast.error('Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                name: name,
                status_message: status,
                avatar_url: avatar,
            })
            .eq('id', user.id);

        setLoading(false);
        if (error) {
            toast.error('Failed to update profile');
        } else {
            toast.success('Profile updated!');
            onUpdate();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-green-900/20 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
<div className="bg-[#0f0f0f] w-full max-w-sm rounded-3xl overflow-hidden border border-green-300/30 animate-scale-in">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>

                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                            <img
                                src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                                alt=""
                                className="w-24 h-24 rounded-full object-cover border-4 border-white/10"
                            />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                {uploading ? <Loader2 className="text-white animate-spin" /> : <Camera className="text-white" />}
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                        </div>
                        <p className="text-xs text-white/40 mt-2">Tap to change avatar</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 font-medium uppercase">Display Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 font-medium uppercase">Status Message</label>
                            <textarea
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 transition-colors h-24 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl gchat-btn text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MorePage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [subPage, setSubPage] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profile, setProfile] = useState<AppUser | null>(null);
    const [currentLang, setCurrentLang] = useState('en');
    const [showShop, setShowShop] = useState<'stickers' | 'themes' | 'coins' | null>(null);
    const [showLabs, setShowLabs] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [showHiddenUsers, setShowHiddenUsers] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [showDevices, setShowDevices] = useState(false);
    const [infoModal, setInfoModal] = useState<{ title: string; message?: string } | null>(null);
    const { signOut, user } = useAuth();
    const { createAIChat, fetchChats } = useChatStore();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();

    const fallbackProfile: AppUser = {
        id: user?.id || 'me',
        avatar: user?.id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` : 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
        name: user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You',
        status: 'online',
        statusMessage: 'Available',
    };

    // Basic i18n dictionary
    const translations: Record<string, Record<string, string>> = {
        en: { settings: 'Settings', account: 'Account', privacy: 'Privacy', language: 'Language', signout: 'Sign Out' },
        th: { settings: 'การตั้งค่า', account: 'บัญชี', privacy: 'ความเป็นส่วนตัว', language: 'ภาษา', signout: 'ออกจากระบบ' },
        ja: { settings: '設定', account: 'アカウント', privacy: 'プライバシー', language: '言語', signout: 'サインアウト' },
    };
    const t = translations[currentLang] || translations.en;

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data && !error) {
            setProfile({
                id: data.id,
                name: data.name,
                avatar: data.avatar_url,
                status: data.status,
                statusMessage: data.status_message,
                phone: data.phone,
            });
        }
    }, [user]);

    const handlePhoneLink = async () => {
        if (!user) return;
        const phone = prompt('Enter your phone number');
        if (!phone) return;

        const { error } = await supabase
            .from('profiles')
            .update({ phone })
            .eq('id', user.id);

        if (error) {
            toast.error(error.message || 'Failed to save phone number');
            return;
        }

        setProfile(prev => ({ ...prev, phone }));
        toast.success('Phone number saved');
    };

    const openAIChat = async () => {
        if (!user) {
            toast.error('Please sign in first');
            return;
        }

        try {
            await createAIChat(user.id);
            await fetchChats(user.id);
            navigate('/chats');
            toast.success('AI chat ready in Chats');
        } catch (err) {
            toast.error('Unable to create AI chat');
        }
    };

    const handleSearchResult = (item: string) => {
        setSearchQuery('');
        switch (item) {
            case 'Profile':
                setShowProfileEdit(true);
                break;
            case 'Account':
                setSubPage('account');
                break;
            case 'Privacy':
                setSubPage('privacy');
                break;
            case 'Back up and restore chat history':
                setSubPage('chats');
                break;
            case 'Easy transfer QR code':
            case 'My QR code':
            case 'Scan QR code':
                setShowQR(true);
                break;
            case 'Add friends':
                setSubPage('qr_scan');
                break;
            case 'Storage and data':
                setSubPage('storage');
                break;
            case 'Language':
                setSubPage('language');
                break;
            case 'Calls':
                navigate('/calls');
                break;
            case 'Photos & videos':
            case 'Albums':
                navigate('/timeline');
                break;
            case 'AI Assistant':
                openAIChat();
                break;
            default:
                setInfoModal({ title: item, message: `${item} is coming soon and will be available in a future release.` });
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSignOut = async () => {
        await signOut();
        toast.success('Signed out');
    };

    const ChatSettings = ({ onBack }: { onBack: () => void }) => {
        const { deleteChat, chats } = useChatStore();
        const handleClearAll = async () => {
            if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                for (const chat of chats) {
                    await deleteChat(chat.id);
                }
                toast.success('All chats cleared');
                onBack();
            }
        };

        return (
            <SettingsSubPage title="Chats" onBack={onBack}>
                <SectionDivider label="History" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow
                        label="Clear all chat history"
                        danger
                        onPress={handleClearAll}
                    />
                </div>
            </SettingsSubPage>
        );
    };

    const PrivacySettings = ({ onBack }: { onBack: () => void }) => {
        const [idSearch, setIdSearch] = useState(true);
        const [nearby, setNearby] = useState(true);
        const [letterSealing, setLetterSealing] = useState(true);

        return (
            <SettingsSubPage title="Privacy" onBack={onBack}>
                <SectionDivider label="Personal Information" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow
                        label="Allow others to add by ID"
                        description="People can find and add you by your GaGa ID"
                        toggle
                        toggleValue={idSearch}
                        onToggle={setIdSearch}
                    />
                    <Separator />
                    <SettingsRow
                        label="Allow nearby people"
                        description="Allow people nearby to see your profile"
                        toggle
                        toggleValue={nearby}
                        onToggle={setNearby}
                    />
                </div>

                <SectionDivider label="Security" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow label="Letter Sealing" description="Enhanced encryption for messages and calls" toggle toggleValue={letterSealing} onToggle={setLetterSealing} />
                    <Separator />
                    <SettingsRow label="Blocked users" onPress={() => setShowBlockedUsers(true)} />
                    <Separator />
                    <SettingsRow label="Hidden users" onPress={() => setShowHiddenUsers(true)} />
                </div>
            </SettingsSubPage>
        );
    };

    const AccountSettings = ({ onBack }: { onBack: () => void }) => {
        const { user } = useAuth();
        const memberSince = user?.created_at
            ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'Recently';

        return (
            <SettingsSubPage title="Account" onBack={onBack}>
                <SectionDivider label="Profile" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow label="Email" value={user?.email || 'Not set'} />
                    <Separator />
                    <SettingsRow label="GaGa ID" value={user?.id.slice(0, 8) || 'Not set'} />
                    <Separator />
                    <SettingsRow label="Phone" value={profile?.phone || 'Not set'} onPress={handlePhoneLink} />
                    <Separator />
                    <SettingsRow label="Member Since" value={memberSince} showArrow={false} />
                </div>

                <SectionDivider label="Security" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow label="Change Password" onPress={async () => {
                        if (!user?.email) {
                            toast.error('No email available to reset password');
                            return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                        if (error) {
                            toast.error(error.message || 'Unable to send reset email');
                        } else {
                            toast.success('Password reset email sent');
                        }
                    }} />
                    <Separator />
                    <SettingsRow label="Two-step verification" toggle toggleValue={false} onToggle={() => setShow2FA(true)} />
                    <Separator />
                    <SettingsRow label="Devices" description="Manage where you're signed in" onPress={() => setShowDevices(true)} />
                </div>

                <SectionDivider label="Danger Zone" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow label="Delete Account" danger onPress={() => toast.error('Account deletion is permanent. Please contact support.')} />
                </div>
            </SettingsSubPage>
        );
    };

    const FriendsSettings = ({ onBack }: { onBack: () => void }) => {
        const [autoAdd, setAutoAdd] = useState(true);
        return (
            <SettingsSubPage title="Friends" onBack={onBack}>
                <SectionDivider label="Friend management" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    <SettingsRow
                        label="Auto-add friends"
                        description="Automatically add people from your contacts"
                        toggle
                        toggleValue={autoAdd}
                        onToggle={setAutoAdd}
                    />
                    <Separator />
                    <SettingsRow
                        label="Allow others to add"
                        description="Allow people who have your number to add you"
                        toggle
                        toggleValue={true}
                    />
                </div>
            </SettingsSubPage>
        );
    };

    const LanguageSettings = ({ onBack, current, onChange }: { onBack: () => void, current: string, onChange: (val: string) => void }) => {
        const languages = [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'th', name: 'Thai', native: 'ไทย' },
            { code: 'ja', name: 'Japanese', native: '日本語' },
            { code: 'ko', name: 'Korean', native: '한국어' },
            { code: 'zh', name: 'Chinese', native: '中文' },
        ];

        return (
            <SettingsSubPage title="Language" onBack={onBack}>
                <SectionDivider label="Display Language" />
                <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
                    {languages.map((lang, i) => (
                        <div key={lang.code}>
                            <button
                                onClick={() => { onChange(lang.code); toast.success(`Language changed to ${lang.name}`); }}
                                className="w-full flex items-center justify-between px-5 py-4 active:bg-white/5 transition-colors"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="text-white text-[15px] font-medium">{lang.native}</span>
                                    <span className="text-white/40 text-[12px]">{lang.name}</span>
                                </div>
                                {current === lang.code && (
                                    <Check size={18} className="text-cyan-300" />
                                )}
                            </button>
                            {i < languages.length - 1 && <Separator />}
                        </div>
                    ))}
                </div>
            </SettingsSubPage>
        );
    };

    if (subPage === 'friends') return <FriendsSettings onBack={() => setSubPage(null)} />;
    if (subPage === 'chats') return <ChatSettings onBack={() => setSubPage(null)} />;
    if (subPage === 'privacy') return <PrivacySettings onBack={() => setSubPage(null)} />;
    if (subPage === 'account') return <AccountSettings onBack={() => setSubPage(null)} />;
    if (subPage === 'language') return <LanguageSettings onBack={() => setSubPage(null)} current={currentLang} onChange={setCurrentLang} />;
    if (subPage === 'storage') return <StorageSettings onBack={() => setSubPage(null)} />;
    if (subPage === 'qr_scan') return (
        <QRScannerPage
            onBack={() => setSubPage(null)}
            onAddFriend={(userId) => {
                toast.success('Friend added!');
                setSubPage(null);
            }}
        />
    );

    const generalItems = [
        { icon: <Bell size={20} />, label: 'Notifications', onPress: () => setSubPage('privacy') },
        { icon: <Image size={20} />, label: 'Photos & videos', onPress: () => navigate('/timeline') },
        { icon: <MessageSquare size={20} />, label: 'Chats', onPress: () => setSubPage('chats') },
        { icon: <Phone size={20} />, label: 'Calls', onPress: () => navigate('/calls') },
        { icon: <BookImage size={20} />, label: 'Albums', onPress: () => navigate('/timeline') },
        { icon: <Users size={20} />, label: 'Friends', onPress: () => setSubPage('friends') },
        { icon: <Globe size={20} />, label: 'Language', onPress: () => setSubPage('language') },
        { icon: <Bot size={20} />, label: 'AI Assistant', onPress: openAIChat },
        { icon: <FlaskConical size={20} />, label: 'GaGa Chat Labs', onPress: () => setShowLabs(true) },
    ];

    const appInfoItems = [
        { icon: <Shield size={20} />, label: 'Privacy Policy' },
        { icon: <Lock size={20} />, label: 'Privacy Center' },
        { icon: <Bell size={20} />, label: 'Announcements' },
        { icon: <UserCircle size={20} />, label: 'Help center' },
        { icon: <Bot size={20} />, label: 'About GaGa Chat' },
    ];

    const allItems = [
        'Profile', 'Account', 'Privacy',
        'Back up and restore chat history', 'Easy transfer QR code', 'Storage and data',
        'Scan QR code', 'My QR code', 'Add friends',
        'Stickers', 'Themes', 'Coins',
        ...generalItems.map(i => i.label),
        ...appInfoItems.map(i => i.label),
    ];

    const filtered = searchQuery
        ? allItems.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header with GaGa Chat branding */}
            <div className="px-5 pt-12 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={logoSrc} alt="GaGa Chat" className="w-10 h-10 rounded-full gchat-logo-glow object-cover" />
                    <h1 className="text-white text-xl font-bold">{t.settings}</h1>
                </div>
                <button aria-label="Open settings options" className="p-2 text-white/60 hover:text-white transition-colors">
                    <Settings size={20} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-3">
                <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
                    <Search size={15} className="text-white/40 flex-shrink-0" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search settings, help articles"
                        className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
                    />
                    {searchQuery && (
                        <button aria-label="Clear search" onClick={() => setSearchQuery('')}>
                            <X size={14} className="text-white/40" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Results */}
            {searchQuery && (
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-black">
                    {filtered.length > 0 ? (
                        <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
                            {filtered.map((item, i) => (
                                <div key={item}>
                                    <SettingsRow label={item} onPress={() => handleSearchResult(item)} />
                                    {i < filtered.length - 1 && <Separator />}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-white/30">
                            <Search size={32} className="mb-2" />
                            <p className="text-sm">No results found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Main Settings List */}
            {!searchQuery && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Profile Row */}
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden mb-1">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
                            onClick={() => setShowProfileEdit(true)}
                        >
                            <div className="relative flex-shrink-0">
                                <img src={profile?.avatar || fallbackProfile.avatar} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black bg-cyan-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-white font-semibold text-[15px]">{profile?.name || fallbackProfile.name}</p>
                                <p className="text-white/40 text-[12px] italic">{profile?.statusMessage || fallbackProfile.statusMessage}</p>
                            </div>
                            <ChevronRight size={18} className="text-white/30" />
                        </button>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-4 gap-4 px-5 py-6">
                        {[
                            { icon: <ScanIcon size={24} className="text-cyan-300" />, label: 'Scan', action: () => setSubPage('qr_scan') },
                            { icon: <QrCode size={24} className="text-blue-400" />, label: 'My QR', action: () => setShowQR(true) },
                            { icon: <UserPlus size={24} className="text-purple-400" />, label: 'Add', action: () => setSubPage('qr_scan') },
                            { icon: <ShieldCheck size={24} className="text-amber-400" />, label: 'Privacy', action: () => setSubPage('privacy') },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={item.action}
                                className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
                                    {item.icon}
                                </div>
                                <span className="text-[11px] text-white/60 font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Personal Row */}
                    <SectionDivider label="Personal" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden mb-1">
                        <SettingsRow icon={<UserCircle size={20} />} label={t.account} onPress={() => setSubPage('account')} />
                        <Separator />
                        <SettingsRow icon={<Shield size={20} />} label={t.privacy} onPress={() => setSubPage('privacy')} />
                    </div>

                    {/* Backup Row */}
                    <SectionDivider label="Data & Backup" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden mb-1">
                        <SettingsRow icon={<Database size={20} />} label="Back up and restore chat history" onPress={() => setSubPage('chats')} />
                        <Separator />
                        <SettingsRow icon={<QrCode size={20} />} label="Easy transfer QR code" onPress={() => setShowQR(true)} />
                        <Separator />
                        <SettingsRow icon={<Database size={20} />} label="Storage and data" onPress={() => setSubPage('storage')} />
                    </div>

                    {/* Shops */}
                    <SectionDivider label="Shops" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
                        <SettingsRow icon={<Smile size={20} />} label="Stickers" onPress={() => setShowShop('stickers')} />
                        <Separator />
                        <SettingsRow icon={<Palette size={20} />} label="Themes" onPress={() => setShowShop('themes')} />
                        <Separator />
                        <SettingsRow icon={<Coins size={20} />} label="Coins" onPress={() => setShowShop('coins')} />
                    </div>

                    {/* Appearance */}
                    <SectionDivider label="Appearance" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
                        <SettingsRow
                            icon={theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                            label="Dark Mode"
                            toggle
                            toggleValue={theme === 'dark'}
                            onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        />
                    </div>

                    {/* General */}
                    <SectionDivider label="General" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
                        {generalItems.map((item, i) => (
                            <div key={item.label}>
                                <SettingsRow icon={item.icon} label={item.label} onPress={item.onPress} />
                                {i < generalItems.length - 1 && <Separator />}
                            </div>
                        ))}
                    </div>

                    {/* App Info */}
                    <SectionDivider label="App Info" />
                    <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
                        {appInfoItems.map((item, i) => (
                            <div key={item.label}>
                                <SettingsRow
                                    icon={item.icon}
                                    label={item.label}
                                    onPress={() => setInfoModal({ title: item.label, message: `${item.label} will be available soon.` })}
                                />
                                {i < appInfoItems.length - 1 && <Separator />}
                            </div>
                        ))}
                    </div>

                    <div className="px-3 pt-8 pb-12">
                        <button
                            onClick={handleSignOut}
                            className="w-full py-4 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut size={20} />
                            {t.signout}
                            {user?.email && <span className="text-red-500/60 text-xs ml-1">({user.email})</span>}
                        </button>
                        <p className="text-center text-white/20 text-xs mt-6">
                            GaGa Chat Version 1.0.0 (Production)<br />
                            © 2026 GaGa Chat Team
                        </p>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-fade-in" onClick={() => setShowQR(false)}>
                    <div className="flex justify-end p-6">
                        <button aria-label="Close QR modal" onClick={() => setShowQR(false)}>
                            <X size={28} className="text-white" />
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-white p-6 rounded-3xl mb-6 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                            <QrCode size={200} className="text-black" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{profile?.name || fallbackProfile.name}</h2>
                        <p className="text-white/50 text-sm">Scan this QR code to add me on GaGa Chat</p>
                    </div>
                </div>
            )}

            {showProfileEdit && (
                <ProfileEditModal
                    currentProfile={profile || fallbackProfile}
                    onUpdate={fetchProfile}
                    onClose={() => setShowProfileEdit(false)}
                />
            )}

            {/* 2FA Modal */}
            {show2FA && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShow2FA(false)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                                <Shield className="text-blue-400" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-3">Two-Step Verification</h2>
                            <p className="text-white/60 text-sm mb-6">Enhanced security feature coming in the next release. This will allow you to add an extra layer of protection to your account.</p>
                            <button onClick={() => setShow2FA(false)} className="w-full py-3 rounded-xl gchat-btn text-black font-bold">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Device Management Modal */}
            {showDevices && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowDevices(false)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Settings className="text-blue-400" size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Active Devices</h2>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                            <Check className="text-cyan-300" size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">This Device</p>
                                            <p className="text-white/40 text-xs">Current session • Active now</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-white/50 text-sm mb-4">Device management with logout options coming soon.</p>
                            <button onClick={() => setShowDevices(false)} className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blocked Users Modal */}
            {showBlockedUsers && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowBlockedUsers(false)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <Shield className="text-red-400" size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Blocked Users</h2>
                            </div>
                            <div className="mb-6">
                                <div className="text-center py-12">
                                    <Users size={32} className="text-white/20 mx-auto mb-3" />
                                    <p className="text-white/60 text-sm">No blocked users yet</p>
                                </div>
                            </div>
                            <p className="text-white/50 text-xs mb-4">When you block someone, they won't be able to contact you or see your profile.</p>
                            <button onClick={() => setShowBlockedUsers(false)} className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Users Modal */}
            {showHiddenUsers && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowHiddenUsers(false)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <Lock className="text-amber-400" size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Hidden Users</h2>
                            </div>
                            <div className="mb-6">
                                <div className="text-center py-12">
                                    <Users size={32} className="text-white/20 mx-auto mb-3" />
                                    <p className="text-white/60 text-sm">No hidden users yet</p>
                                </div>
                            </div>
                            <p className="text-white/50 text-xs mb-4">Hide users to remove them from your chat list without blocking them.</p>
                            <button onClick={() => setShowHiddenUsers(false)} className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shop Modal */}
            {showShop && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowShop(null)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
                                {showShop === 'stickers' && <Smile className="text-black" size={32} />}
                                {showShop === 'themes' && <Palette className="text-black" size={32} />}
                                {showShop === 'coins' && <Coins className="text-black" size={32} />}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 capitalize">{showShop} Shop</h2>
                            <p className="text-white/60 text-sm mb-6">
                                {showShop === 'stickers' && 'Express yourself with premium sticker packs'}
                                {showShop === 'themes' && 'Customize your GaGa Chat experience with unique themes'}
                                {showShop === 'coins' && 'Earn or purchase coins to unlock premium features'}
                            </p>
                            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                                <p className="text-white/50 text-sm">⏰ Coming Soon</p>
                            </div>
                            <button onClick={() => setShowShop(null)} className="w-full py-3 rounded-xl gchat-btn text-black font-bold">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Labs Modal */}
            {showLabs && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowLabs(false)}>
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <FlaskConical className="text-purple-400" size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">GaGa Chat Labs</h2>
                            </div>
                            <p className="text-white/60 text-sm mb-6">Experimental features to try out new capabilities:</p>
                            <div className="space-y-3 mb-6">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <p className="text-white text-sm font-medium">🤖 Advanced AI</p>
                                    <p className="text-white/50 text-xs">AI with enhanced reasoning</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <p className="text-white text-sm font-medium">🎨 Theme Creator</p>
                                    <p className="text-white/50 text-xs">Design your own themes</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <p className="text-white text-sm font-medium">📱 Desktop Client</p>
                                    <p className="text-white/50 text-xs">Native app experience</p>
                                </div>
                            </div>
                            <button onClick={() => setShowLabs(false)} className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MorePage;
