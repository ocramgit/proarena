"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Settings,
  ChevronLeft,
  Loader2,
  Save,
  Palette,
  Image,
  Flag,
  FileText,
  Monitor,
  Mouse,
  Keyboard,
  Headphones,
  Target,
  Check
} from "lucide-react";

/**
 * FASE 54: PROFILE SETTINGS - THEME ENGINE
 * Customize banner, theme color, setup, peripherals
 */

const THEME_COLORS = [
  { id: "amber", name: "Amber", color: "#F59E0B" },
  { id: "purple", name: "Purple", color: "#A855F7" },
  { id: "cyan", name: "Cyan", color: "#06B6D4" },
  { id: "red", name: "Red", color: "#EF4444" },
  { id: "green", name: "Green", color: "#22C55E" },
  { id: "blue", name: "Blue", color: "#3B82F6" },
];

const COUNTRIES = [
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateCustomization = useMutation(api.profile.updateProfileCustomization);
  const updateSetup = useMutation(api.profile.updateSetup);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"appearance" | "setup">("appearance");

  // Appearance state
  const [profileBannerUrl, setProfileBannerUrl] = useState("");
  const [themeColor, setThemeColor] = useState("amber");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");

  // Setup state
  const [crosshairCode, setCrosshairCode] = useState("");
  const [resolution, setResolution] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [mouseDpi, setMouseDpi] = useState<number | undefined>();
  const [sensitivity, setSensitivity] = useState<number | undefined>();
  const [mouseModel, setMouseModel] = useState("");
  const [keyboardModel, setKeyboardModel] = useState("");
  const [monitorModel, setMonitorModel] = useState("");
  const [headsetModel, setHeadsetModel] = useState("");

  // Load current values
  useEffect(() => {
    if (currentUser) {
      setProfileBannerUrl(currentUser.profileBannerUrl || "");
      setThemeColor(currentUser.themeColor || "amber");
      setCountry(currentUser.country || "");
      setBio(currentUser.bio || "");
      setCrosshairCode(currentUser.crosshairCode || "");
      setResolution(currentUser.resolution || "");
      setAspectRatio(currentUser.aspectRatio || "");
      setMouseDpi(currentUser.mouseDpi);
      setSensitivity(currentUser.sensitivity);
      setMouseModel(currentUser.mouseModel || "");
      setKeyboardModel(currentUser.keyboardModel || "");
      setMonitorModel(currentUser.monitorModel || "");
      setHeadsetModel(currentUser.headsetModel || "");
    }
  }, [currentUser]);

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      await updateCustomization({
        profileBannerUrl: profileBannerUrl || undefined,
        themeColor,
        country: country || undefined,
        bio: bio || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSetup = async () => {
    setIsSaving(true);
    try {
      await updateSetup({
        crosshairCode: crosshairCode || undefined,
        resolution: resolution || undefined,
        aspectRatio: aspectRatio || undefined,
        mouseDpi,
        sensitivity,
        mouseModel: mouseModel || undefined,
        keyboardModel: keyboardModel || undefined,
        monitorModel: monitorModel || undefined,
        headsetModel: headsetModel || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading
  if (currentUser === undefined) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Definições do Perfil</h1>
                <p className="text-zinc-400">Personaliza a tua página @{currentUser.nickname}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === "appearance"
                  ? "text-orange-500 border-orange-500"
                  : "text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              <Palette className="w-4 h-4" />
              Aparência
            </button>
            <button
              onClick={() => setActiveTab("setup")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === "setup"
                  ? "text-orange-500 border-orange-500"
                  : "text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4" />
              Setup & Periféricos
            </button>
          </div>

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Banner URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <Image className="w-4 h-4" />
                  Banner URL
                </label>
                <input
                  type="url"
                  value={profileBannerUrl}
                  onChange={(e) => setProfileBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Recomendado: 1920x400px</p>
                {profileBannerUrl && (
                  <div className="mt-2 h-24 rounded-lg overflow-hidden">
                    <img src={profileBannerUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Theme Color */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <Palette className="w-4 h-4" />
                  Cor de Tema
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {THEME_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setThemeColor(color.id)}
                      className={`aspect-square rounded-xl border-2 transition-all ${
                        themeColor === color.id
                          ? "border-white scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.color }}
                      title={color.name}
                    >
                      {themeColor === color.id && (
                        <Check className="w-5 h-5 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <Flag className="w-4 h-4" />
                  País
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Selecionar país</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <FileText className="w-4 h-4" />
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escreve algo sobre ti..."
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">{bio.length}/300 caracteres</p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveAppearance}
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Guardado!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Aparência
                  </>
                )}
              </button>
            </div>
          )}

          {/* Setup Tab */}
          {activeTab === "setup" && (
            <div className="space-y-6">
              {/* Crosshair */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <Target className="w-4 h-4" />
                  Código da Mira
                </label>
                <input
                  type="text"
                  value={crosshairCode}
                  onChange={(e) => setCrosshairCode(e.target.value)}
                  placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              {/* Resolution & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <Monitor className="w-4 h-4" />
                    Resolução
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Selecionar</option>
                    <option value="1920x1080">1920x1080</option>
                    <option value="1280x960">1280x960</option>
                    <option value="1024x768">1024x768</option>
                    <option value="1280x1024">1280x1024</option>
                    <option value="1600x900">1600x900</option>
                    <option value="2560x1440">2560x1440</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Selecionar</option>
                    <option value="16:9">16:9</option>
                    <option value="4:3">4:3 (Stretched)</option>
                    <option value="4:3 Black Bars">4:3 (Black Bars)</option>
                    <option value="16:10">16:10</option>
                  </select>
                </div>
              </div>

              {/* DPI & Sensitivity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <Mouse className="w-4 h-4" />
                    DPI do Rato
                  </label>
                  <input
                    type="number"
                    value={mouseDpi || ""}
                    onChange={(e) => setMouseDpi(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="800"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Sensibilidade In-Game</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sensitivity || ""}
                    onChange={(e) => setSensitivity(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="1.0"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Peripherals */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="font-bold text-white mb-4">Periféricos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                      <Mouse className="w-4 h-4" />
                      Mouse
                    </label>
                    <input
                      type="text"
                      value={mouseModel}
                      onChange={(e) => setMouseModel(e.target.value)}
                      placeholder="Ex: Logitech G Pro X"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                      <Keyboard className="w-4 h-4" />
                      Teclado
                    </label>
                    <input
                      type="text"
                      value={keyboardModel}
                      onChange={(e) => setKeyboardModel(e.target.value)}
                      placeholder="Ex: Wooting 60HE"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                      <Monitor className="w-4 h-4" />
                      Monitor
                    </label>
                    <input
                      type="text"
                      value={monitorModel}
                      onChange={(e) => setMonitorModel(e.target.value)}
                      placeholder="Ex: BenQ XL2546K 240Hz"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                      <Headphones className="w-4 h-4" />
                      Headset
                    </label>
                    <input
                      type="text"
                      value={headsetModel}
                      onChange={(e) => setHeadsetModel(e.target.value)}
                      placeholder="Ex: HyperX Cloud II"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveSetup}
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Guardado!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Setup
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
