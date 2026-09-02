/**
 * Design reminder — 静默照护手册：用暖米纸色、鼠尾草绿、任务编号与有效期印章，
 * 让移动端照护交接像一张清晰、可信、可传递的纸质手册，而非普通表单。
 */
import { toPng } from "html-to-image";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  HeartHandshake,
  Home as HomeIcon,
  Info,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  PawPrint,
  Plus,
  QrCode,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Utensils,
  X,
} from "lucide-react";
import QRCode from "qrcode";
/**
 * 视觉准则：静默照护手册。主题仅改变纸张温度、边缘注释与短标签，
 * 任务带、有效期印章、猫尾勾选品牌符号与二维码保护区始终保持稳定。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const HERO = "/manus-storage/care-card-hero-reference_c2b54565.jpg";
const PET_MORNING = HERO;
const TAIL_MARK = "/manus-storage/care-card-tail-check-mark_e28d26dc.png";
const SHARE_STICKER = "/manus-storage/care-card-share-cat-sticker_06c5beea.png";
const THEME_DECOR: Record<ThemeKey, string> = {
  daily: "/manus-storage/care-card-daily-garden_21b617dd.png",
  trip: "/manus-storage/care-card-trip-adventure_b1ca27dc.png",
  festival: "/manus-storage/care-card-festival-celebration_7af152f0.png",
};

type Page = "welcome" | "create" | "preview" | "caregiver" | "revoked";
type ThemeKey = "daily" | "trip" | "festival";

const themes: Record<ThemeKey, { name: string; eyebrow: string; description: string; cardLabel: string; shareLine: string; shareSubline: string }> = {
  daily: { name: "日常", eyebrow: "HOME NOTE", description: "像留在冰箱上的安心便签", cardLabel: "日常照护", shareLine: "在熟悉的家里，被好好照顾", shareSubline: "HOME CARE · 一份给主人安心的小纸条" },
  trip: { name: "出游", eyebrow: "TRAVEL PASS", description: "像一张随行的出发交接单", cardLabel: "出游照护", shareLine: "主人出发，照顾也顺利抵达", shareSubline: "TRAVEL CARE · 本次照护通行证" },
  festival: { name: "节日", eyebrow: "A LITTLE WISH", description: "像可以分享的温暖节日贺卡", cardLabel: "节日照护", shareLine: "节日里，也请替我抱抱它", shareSubline: "FESTIVE CARE · 一张有温度的交接卡" },
};

type CareTask = {
  label: string;
  detail: string;
  icon: "food" | "water" | "litter" | "play";
};

const defaultTasks: CareTask[] = [
  { label: "准备早餐", detail: "半罐湿粮 + 一小把干粮", icon: "food" },
  { label: "换水", detail: "厨房饮水机旁的白色碗", icon: "water" },
  { label: "清理猫砂", detail: "阳台角落，补一点新砂", icon: "litter" },
  { label: "陪玩 10 分钟", detail: "逗猫棒在电视柜抽屉", icon: "play" },
];

type CachedConfig = {
  petName: string;
  ownerName: string;
  tasks: CareTask[];
  note: string;
  expiryDays: number;
  careStart: string;
  careEnd: string;
  theme: ThemeKey;
  photoDataUrl?: string;
  photoPosition?: { x: number; y: number };
};

const CONFIG_CACHE_KEY = "maomiaocare-config-v1";

const readCachedConfig = (): CachedConfig | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedConfig>;
    if (!parsed.petName || !parsed.careStart || !parsed.careEnd || !Array.isArray(parsed.tasks)) return null;
    return parsed as CachedConfig;
  } catch {
    return null;
  }
};

export const formatDateTimeLabel = (value: string) => {
  const [date, clock] = value.split("T");
  const [, month, day] = date.split("-");
  return `${Number(month)} 月 ${Number(day)} 日 · ${clock}`;
};

export const isCareRangeValid = (start: string, end: string) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime;
};

const steps = ["照看时间", "认识一下", "本次任务", "特别注意"];

const getLocalDateValue = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatShortDate = (value: string) => {
  const [, month, day] = value.split("-");
  return `${Number(month)} 月 ${Number(day)} 日`;
};

function TaskIcon({ type }: { type: CareTask["icon"] }) {
  if (type === "food") return <Utensils size={18} strokeWidth={1.9} />;
  if (type === "water") return <span className="text-[18px] leading-none">◒</span>;
  if (type === "litter") return <span className="text-[17px] leading-none">⌁</span>;
  return <span className="text-[18px] leading-none">✦</span>;
}

function TinyStamp({ children, tone = "sage" }: { children: React.ReactNode; tone?: "sage" | "gold" | "ink" }) {
  return <span className={`tiny-stamp tiny-stamp-${tone}`}>{children}</span>;
}

function TailCheckMark({ compact = false }: { compact?: boolean }) {
  return <span className={`tail-check-mark ${compact ? "is-compact" : ""}`} aria-hidden="true"><img src={TAIL_MARK} alt="" /></span>;
}

function ProgressLine({ active }: { active: number }) {
  return (
    <div className="step-rail" aria-label={`创建进度，第 ${active + 1} 步，共 4 步`}>
      {steps.map((label, index) => (
        <div className={`step-rail-item ${index === active ? "is-current" : ""} ${index < active ? "is-complete" : ""}`} key={label}>
          <span className={`step-dot ${index <= active ? "is-active" : ""} ${index === active ? "is-current" : ""}`}>{index < active ? <Check size={11} /> : String(index + 1).padStart(2, "0")}</span>
          <span className={index === active ? "text-[#344237]" : "text-[#9a998f]"}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="bottom-action-bar">{children}</div>;
}

export default function Home() {
  const [page, setPage] = useState<Page>("welcome");
  const [step, setStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");
  const [petName, setPetName] = useState("奶盖");
  const [ownerName, setOwnerName] = useState("林安");
  const [tasks, setTasks] = useState<CareTask[]>(defaultTasks);
  const [note, setNote] = useState("不喜欢被强抱。躲在床底时不用拉它出来，自己会出来。")
  const [expiryDays, setExpiryDays] = useState(14);
  const [careStart, setCareStart] = useState(() => `${getLocalDateValue()}T09:30`);
  const [careEnd, setCareEnd] = useState(() => `${getLocalDateValue(1)}T17:30`);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [isCustomEndDateOpen, setIsCustomEndDateOpen] = useState(false);
  const [timeSyncState, setTimeSyncState] = useState<"idle" | "synced">("idle");
  const [hasSavedConfig, setHasSavedConfig] = useState(() => Boolean(readCachedConfig()));
  const [theme, setTheme] = useState<ThemeKey>("daily");
  const [petPhoto, setPetPhoto] = useState(HERO);
  const [isCustomPhoto, setIsCustomPhoto] = useState(false);
  const [photoPosition, setPhotoPosition] = useState({ x: 50, y: 50 });
  const [qrData, setQrData] = useState("");
  const [doneTasks, setDoneTasks] = useState<number[]>([]);
  const [isRevoked, setIsRevoked] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "create" || view === "preview" || view === "caregiver") setPage(view);
    const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < steps.length) setStep(requestedStep);
    const requestedTheme = new URLSearchParams(window.location.search).get("theme");
    if (requestedTheme === "daily" || requestedTheme === "trip" || requestedTheme === "festival") setTheme(requestedTheme);
  }, []);

  const expiryLabel = `8 月 ${17 + expiryDays} 日前有效`;
  const startLabel = formatDateTimeLabel(careStart);
  const endLabel = formatDateTimeLabel(careEnd);
  const isOvernight = careStart.split("T")[0] !== careEnd.split("T")[0];
  const carePeriodLabel = isOvernight ? `${startLabel} 至 ${endLabel}` : `${startLabel} 至 ${careEnd.split("T")[1]}`;
  const fullLink = "https://maomiaocare.cn/c/naigai-8d2k";

  useEffect(() => {
    QRCode.toDataURL(fullLink, {
      width: 220,
      margin: 1,
      color: { dark: "#2d3a30", light: "#f8f4eb" },
    }).then(setQrData);
  }, []);

  const openCreator = () => {
    setIsRevoked(false);
    setImageReady(false);
    setSlideDirection("forward");
    setPage("create");
    setStep(0);
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setSlideDirection("forward");
      setStep((current) => current + 1);
    } else {
      saveCurrentConfig();
      setPage("preview");
    }
  };

  const previousStep = () => {
    if (step > 0) {
      setSlideDirection("backward");
      setStep((current) => current - 1);
    }
    else setPage("welcome");
  };

  const exportImage = async (shouldShare = false) => {
    if (!shareCardRef.current) return;
    setIsRendering(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f8f4eb",
      });
      setImageReady(true);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${petName}-照护交接卡.png`, { type: "image/png" });

      if (shouldShare && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${petName}的照护交接卡`,
          text: `这是${petName}本次的照护说明，扫码可查看完整信息。`,
        });
        toast.success("已调起分享面板", { description: "照护者扫码即可查看完整说明。" });
      } else {
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = `${petName}-照护交接卡.png`;
        anchor.click();
        toast.success("图片卡已保存", { description: "现在可以直接发给照护者。" });
      }
    } catch {
      toast.error("图片生成遇到问题", { description: "请稍后再试，或直接复制网页版链接。" });
    } finally {
      setIsRendering(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      toast.success("完整版链接已复制", { description: "有效期内可随时撤回。" });
    } catch {
      toast.message("链接：maomiaocare.cn/c/naigai-8d2k");
    }
  };

  const toggleTask = (index: number) => {
    setDoneTasks((previous) => (previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index]));
  };

  const photoStyle = { objectPosition: `${photoPosition.x}% ${photoPosition.y}%` };
  const [careDate, careTime] = careStart.split("T");
  const [careEndDate, careEndTime] = careEnd.split("T");
  const dateOptions = useMemo(() => [
    { label: "今天", value: getLocalDateValue(0), helper: formatShortDate(getLocalDateValue(0)) },
    { label: "明天", value: getLocalDateValue(1), helper: formatShortDate(getLocalDateValue(1)) },
    { label: "后天", value: getLocalDateValue(2), helper: formatShortDate(getLocalDateValue(2)) },
  ], []);
  const timeOptions = [
    { label: "上午", value: "09:30" }, { label: "午间", value: "12:00" }, { label: "下午", value: "14:30" },
    { label: "傍晚", value: "17:30" }, { label: "晚上", value: "20:00" },
  ];
  const updateCareStart = (nextDate = careDate, nextTime = careTime) => {
    const nextStart = `${nextDate}T${nextTime}`;
    setCareStart(nextStart);
    if (!isCareRangeValid(nextStart, careEnd)) {
      const base = new Date(`${getLocalDateValue()}T00:00`).getTime();
      const nextOffset = Math.max(1, Math.round((new Date(nextStart).getTime() - base) / 86400000));
      setCareEnd(`${getLocalDateValue(nextOffset)}T17:30`);
    }
    setTimeSyncState("idle");
  };
  const updateCareEnd = (nextDate = careEndDate, nextTime = careEndTime) => {
    const nextEnd = `${nextDate}T${nextTime}`;
    if (new Date(nextEnd).getTime() <= new Date(careStart).getTime()) {
      toast.message("结束时间需要晚于开始时间", { description: "可以把结束日期改为明天或更晚。" });
      return;
    }
    setCareEnd(nextEnd);
    setTimeSyncState("idle");
  };
  const syncTimeRange = () => {
    setTimeSyncState("synced");
    window.setTimeout(() => setTimeSyncState("idle"), 2200);
  };

  const saveCurrentConfig = () => {
    const baseConfig: CachedConfig = { petName, ownerName, tasks, note, expiryDays, careStart, careEnd, theme };
    const config: CachedConfig = isCustomPhoto && petPhoto.startsWith("data:") ? { ...baseConfig, photoDataUrl: petPhoto, photoPosition } : baseConfig;
    try {
      window.localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
      setHasSavedConfig(true);
      toast.success("配置已保存在本机", { description: config.photoDataUrl ? "文字、照护时段和宠物照片都会尝试恢复。" : "下次可以一键继续上次的照护卡。" });
    } catch {
      try {
        window.localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(baseConfig));
        setHasSavedConfig(true);
        toast.success("文字配置已保存在本机", { description: "照片较大，未缓存照片；下次可重新选择。" });
      } catch {
        toast.error("暂时无法保存配置", { description: "请检查浏览器的本地存储权限。" });
      }
    }
  };

  const applyCachedConfig = () => {
    const config = readCachedConfig();
    if (!config) {
      setHasSavedConfig(false);
      toast.message("还没有可复用的配置");
      return;
    }
    setPetName(config.petName);
    setOwnerName(config.ownerName);
    setTasks(config.tasks);
    setNote(config.note);
    setExpiryDays(config.expiryDays);
    setCareStart(config.careStart);
    setCareEnd(config.careEnd);
    setTheme(config.theme);
    if (config.photoDataUrl) {
      setPetPhoto(config.photoDataUrl);
      setIsCustomPhoto(true);
      setPhotoPosition(config.photoPosition ?? { x: 50, y: 50 });
    } else {
      setPetPhoto(HERO);
      setIsCustomPhoto(false);
      setPhotoPosition({ x: 50, y: 50 });
    }
    setIsRevoked(false);
    setImageReady(false);
    setPage("preview");
    toast.success("已继续上次配置", { description: config.photoDataUrl ? "文字、照护时段、主题和宠物照片已恢复。" : "文字、照护时段和主题已恢复；照片需要重新选择。" });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      toast.error("图片请小于 8MB", { description: "压缩后再上传，会生成得更快。" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPetPhoto(reader.result);
        setPhotoPosition({ x: 50, y: 50 });
        setIsCustomPhoto(true);
        toast.success("宠物照片已替换", { description: "已自动居中裁剪，可继续微调构图。" });
      }
    };
    reader.readAsDataURL(selected);
  };

  const renderWelcome = () => (
    <div className="screen welcome-screen">
      <div className="welcome-photo" style={{ backgroundImage: `url(${HERO})` }} />
      <div className="paper-noise" />
      <header className="mobile-header welcome-header">
        <button className="brand-lockup" onClick={() => setPage("welcome")} aria-label="猫咪照护卡首页">
          <span className="brand-mark-wrap"><TailCheckMark /></span>
          <span>猫咪照护卡</span>
        </button>
        <button className="header-icon" onClick={() => toast.message("每一张卡都可设置有效期并随时收回。")} aria-label="了解隐私说明">
          <CircleHelp size={19} />
        </button>
      </header>

      <section className="welcome-card-glimpse" aria-label="照护交接卡缩影">
        <div className="glimpse-meta"><span><TailCheckMark compact /> {petName} · 上门照护</span><TinyStamp tone="gold">至 8/31 有效</TinyStamp></div>
        <div className="glimpse-track" />
        <div className="glimpse-start"><HomeIcon size={12} /><span>{isOvernight ? "连续照护" : "开始照看"}</span><b>{isOvernight ? `${startLabel} 起` : startLabel}</b></div>
        <div className="glimpse-tasks">
          <div><b>01</b><span>准备早餐 · 半罐湿粮</span></div>
          <div><b>02</b><span>换水 · 厨房白色碗</span></div>
        </div>
        <span className="glimpse-note">CARE NOTE · 扫码可查看完整说明</span>
      </section>

      <main className="welcome-main">
        <TinyStamp tone="gold"><PawPrint size={12} /> 给临时照护者的交接卡</TinyStamp>
        <h1>先把本次要做的事，<br /><em>交代清楚。</em></h1>
        <p>出门前花 5 分钟，整理成一张能直接转发的照护图片。照护者扫码，就能看懂完整说明。</p>
        <div className="welcome-checks">
          <span><Check size={14} /> 无需下载</span>
          <span><Check size={14} /> 可撤回</span>
          <span><Check size={14} /> 图片直接转发</span>
        </div>
        {hasSavedConfig && <button className="resume-config-card" onClick={applyCachedConfig}><span className="resume-config-mark"><TailCheckMark compact /></span><span><b>继续上次配置</b><small>文字、主题和照护时段已保存；照片会在设备允许时恢复</small></span><ChevronRight size={17} /></button>}
      </main>

      <BottomBar>
        <button className="primary-button" onClick={openCreator}>
          <span>为 {petName} 做一张交接卡</span><ArrowUpRight size={19} />
        </button>
        <button className="text-button" onClick={() => setPage("preview")}>先看照护者收到的样子 <ChevronRight size={16} /></button>
      </BottomBar>
    </div>
  );

  const renderStepContent = () => {
    const sectionClass = `form-section step-transition ${slideDirection === "forward" ? "step-enter-forward" : "step-enter-backward"}`;
    if (step === 1) {
      return (
        <div className={sectionClass} key={`${step}-${slideDirection}`}>
          <span className="eyebrow">02 · 认识一下</span>
          <h2>这张卡是给谁准备的？</h2>
          <p>先写下宠物的小名。照护者打开卡片时，会先看到它。</p>
          <div className="profile-picker">
            <div className="profile-photo-frame"><img src={petPhoto} style={photoStyle} alt={`${petName}的头像预览`} /></div>
            <div>
              <b>{isCustomPhoto ? "正在使用你的照片" : "使用示例照片"}</b>
              <span>{isCustomPhoto ? "已自动居中裁剪" : "上传一张正脸照会更有记忆点"}</span>
            </div>
            <button onClick={() => photoInputRef.current?.click()}>{isCustomPhoto ? "更换" : "上传"}</button>
          </div>
          <input ref={photoInputRef} className="photo-upload-input" type="file" accept="image/*" onChange={handlePhotoUpload} />
          {isCustomPhoto && <div className="crop-panel">
            <div><span>自动裁剪完成</span><button onClick={() => setPhotoPosition({ x: 50, y: 50 })}>居中</button></div>
            <label>左右构图<input type="range" min="20" max="80" value={photoPosition.x} onChange={(event) => setPhotoPosition((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
            <label>上下构图<input type="range" min="20" max="80" value={photoPosition.y} onChange={(event) => setPhotoPosition((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
          </div>}
          <label className="field-label">宠物的名字<input value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="比如：奶盖" /></label>
          <div className="choice-row">
            <button className="choice is-selected"><PawPrint size={17} /> 猫咪</button>
            <button className="choice" onClick={() => toast.message("首版先专注猫咪照护，狗狗版本正在准备。")}>狗狗（即将支持）</button>
          </div>
          <h3 className="setting-subtitle profile-theme-title">选一张交接卡主题</h3>
          <p className="setting-subcopy">主题会同步到图片交接卡；内容与二维码不会改变。</p>
          <div className="theme-picker">
            {(Object.keys(themes) as ThemeKey[]).map((key) => <button key={key} className={`theme-choice theme-choice-${key} ${theme === key ? "is-selected" : ""}`} onClick={() => setTheme(key)}>
              <span className="theme-choice-swatch"><img src={THEME_DECOR[key]} alt="" /></span><div><b>{themes[key].name}</b><small>{themes[key].description}</small></div>{theme === key && <Check size={16} />}
            </button>)}
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className={sectionClass} key={`${step}-${slideDirection}`}>
          <span className="eyebrow">03 · 本次任务</span>
          <h2>照护者本次要做什么？</h2>
          <p>只保留最重要的 4 件事。它们不按时间排序，照护者完成后可自行勾选。</p>
          <div className="task-editor-list">
            {tasks.map((task, index) => (
              <button className="task-edit-item" key={task.label} onClick={() => toast.message(`“${task.label}” 的编辑面板将在正式版打开。`)}>
                <span className="number-round">{String(index + 1).padStart(2, "0")}</span>
                <span className="task-edit-copy"><b>{task.label}</b><small>{task.detail}</small></span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          <button className="add-task" onClick={() => toast.message("首版保持四项任务，避免照护者在长列表里迷失。")}><Plus size={17} /> 添加一项任务</button>
        </div>
      );
    }
    if (step === 3) {
      return (
        <div className={sectionClass} key={`${step}-${slideDirection}`}>
          <span className="eyebrow">04 · 特别注意</span>
          <h2>有哪些事，请不要忽略？</h2>
          <p>写那些微信聊天里最容易被漏看、却会让主人担心的细节。</p>
          <label className="field-label">照护提醒<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={80} /></label>
          <div className="subtle-note"><Info size={15} /><span>不要写门禁密码、完整地址或医疗记录。这些信息不适合出现在图片里。</span></div>
          <label className="field-label">需要联系谁？<input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="比如：林安" /></label>
          <h3 className="setting-subtitle profile-theme-title">这张卡要保留多久？</h3>
          <p className="setting-subcopy">时间到了会自动收好。你也可以随时撤回链接。</p>
          <div className="expiry-options">
            {[7, 14, 30].map((days) => (
              <button key={days} className={`expiry-option ${expiryDays === days ? "is-selected" : ""}`} onClick={() => setExpiryDays(days)}>
                <span>{days}</span><small>天后失效</small>{expiryDays === days && <Check size={17} />}
              </button>
            ))}
          </div>
          <div className="privacy-card">
            <ShieldCheck size={22} />
            <div><b>图片只放必要任务</b><span>完整说明通过图片里的二维码打开，你可随时关闭。</span></div>
          </div>
          <button className="cache-config-button" onClick={saveCurrentConfig}><KeyRound size={17} /><span><b>{hasSavedConfig ? "更新本机配置" : "保存这套配置到本机"}</b><small>下次打开时可一键跳过填写，照片会尽量一并保存</small></span><ChevronRight size={16} /></button>
        </div>
      );
    }
    return (
      <div className={sectionClass} key={`${step}-${slideDirection}`}>
        <span className="eyebrow">01 · 照看时间</span>
        <h2>本次什么时候开始照看？</h2>
        <p>先确认开始上门或开始照看的时间。不为每项任务设置时间轴。</p>
        <div className="mobile-time-picker" aria-label="连续照护时间段">
          <div className="picker-heading"><span>从哪天开始？</span><small>START DATE</small></div>
          <div className="date-quick-grid">
            {dateOptions.map((option) => <button className={`date-quick-option ${careDate === option.value ? "is-selected" : ""}`} key={option.value} onClick={() => { updateCareStart(option.value); setIsCustomDateOpen(false); }}><b>{option.label}</b><span>{option.helper}</span></button>)}
            <button className={`date-quick-option date-custom-trigger ${isCustomDateOpen ? "is-selected" : ""}`} onClick={() => setIsCustomDateOpen((open) => !open)}><CalendarDays size={15} /><span>自选日期</span></button>
          </div>
          {isCustomDateOpen && <label className="mobile-date-native"><CalendarDays size={17} /><span>选择开始日期</span><input type="date" value={careDate} onChange={(event) => updateCareStart(event.target.value)} /></label>}
          <div className="picker-heading time-picker-heading"><span>几点开始上门？</span><small>START TIME</small></div>
          <div className="time-quick-grid">
            {timeOptions.map((option) => <button className={`time-quick-option ${careTime === option.value ? "is-selected" : ""}`} key={option.value} onClick={() => updateCareStart(careDate, option.value)}><b>{option.label}</b><span>{option.value}</span></button>)}
            <label className={`time-quick-option time-custom-option ${!timeOptions.some((option) => option.value === careTime) ? "is-selected" : ""}`}><Clock3 size={15} /><span>其他时间</span><input type="time" value={careTime} onChange={(event) => updateCareStart(careDate, event.target.value)} aria-label="选择其他开始时间" /></label>
          </div>
          <div className="range-divider"><span>照护持续到</span><i /></div>
          <div className="picker-heading"><span>哪天结束？</span><small>END DATE</small></div>
          <div className="date-quick-grid end-date-grid">
            {dateOptions.map((option) => <button className={`date-quick-option ${careEndDate === option.value ? "is-selected" : ""}`} key={`end-${option.value}`} onClick={() => updateCareEnd(option.value)}><b>{option.label}</b><span>{option.helper}</span></button>)}
            <button className={`date-quick-option date-custom-trigger ${isCustomEndDateOpen ? "is-selected" : ""}`} onClick={() => setIsCustomEndDateOpen((open) => !open)}><CalendarDays size={15} /><span>自选日期</span></button>
          </div>
          {isCustomEndDateOpen && <label className="mobile-date-native"><CalendarDays size={17} /><span>选择结束日期</span><input type="date" min={careDate} value={careEndDate} onChange={(event) => updateCareEnd(event.target.value)} /></label>}
          <div className="picker-heading time-picker-heading"><span>几点结束照看？</span><small>END TIME</small></div>
          <div className="time-quick-grid end-time-grid">
            {timeOptions.map((option) => <button className={`time-quick-option ${careEndTime === option.value ? "is-selected" : ""}`} key={`end-${option.value}`} onClick={() => updateCareEnd(careEndDate, option.value)}><b>{option.label}</b><span>{option.value}</span></button>)}
            <label className={`time-quick-option time-custom-option ${!timeOptions.some((option) => option.value === careEndTime) ? "is-selected" : ""}`}><Clock3 size={15} /><span>其他时间</span><input type="time" value={careEndTime} onChange={(event) => updateCareEnd(careEndDate, event.target.value)} aria-label="选择其他结束时间" /></label>
          </div>
        </div>
        <div className="start-time-preview start-time-first"><HomeIcon size={17} /><span>照护者会看到</span><b>{carePeriodLabel}</b></div>
        <button className={`schedule-intro-card ${timeSyncState === "synced" ? "is-synced" : ""}`} onClick={syncTimeRange}><CheckCircle2 size={20} /><div><b>{timeSyncState === "synced" ? "时间段已同步" : "已选连续照护时间"}</b><span>{timeSyncState === "synced" ? "交接卡和照护者页面都会使用这段时间。" : `${isOvernight ? "跨天照护" : "当天照护"} · 点击确认并同步到交接卡。`}</span></div>{timeSyncState === "synced" && <Check size={16} />}</button>
      </div>
    );
  };

  const renderCreate = () => (
    <div className={`screen create-screen theme-${theme}`}>
      <header className="mobile-header">
        <button className="header-icon quiet" onClick={previousStep} aria-label="返回"><ArrowLeft size={20} /></button>
        <span className="header-title"><TailCheckMark compact />新建照护交接卡</span>
        <span className="header-count">{step + 1}/4</span>
      </header>
      <ProgressLine active={step} />
      <main className="form-main">{renderStepContent()}</main>
      <BottomBar>
        <button className="primary-button" onClick={nextStep}>{step === steps.length - 1 ? "查看交接卡" : ["填写宠物资料", "整理本次任务", "补充特别提醒"][step]}<ChevronRight size={19} /></button>
      </BottomBar>
    </div>
  );

  const renderPreview = () => (
    <div className="screen preview-screen">
      <header className="mobile-header compact">
        <button className="header-icon quiet" onClick={() => setPage("create")} aria-label="继续编辑"><ArrowLeft size={20} /></button>
        <span className="header-title"><TailCheckMark compact />交接图片预览</span>
        <button className="header-icon quiet" onClick={() => toast.message("这张图片会保存在你的手机相册。") } aria-label="图片说明"><Info size={19} /></button>
      </header>
      <main className="preview-main">
        <div className="preview-intro"><TinyStamp tone="sage"><FileImage size={12} /> 图片交接卡</TinyStamp><h2>照护者会收到这样的图片</h2><p>图片能直接转发；扫描二维码可查看完整说明。</p></div>
        <div ref={shareCardRef} className={`share-card theme-${theme}`} id="share-card">
          <img src={THEME_DECOR[theme]} className="share-decor" alt="" />
          <div className="share-card-topline"><TailCheckMark compact /><span>猫咪照护卡 · {themes[theme].cardLabel}</span><span className="share-card-seal">限时交接</span></div>
          <div className="share-theme-intro"><span>{themes[theme].eyebrow}</span><b>{themes[theme].shareLine}</b><small>{themes[theme].shareSubline}</small></div>
          <div className="share-card-pet">
            <img src={petPhoto} style={photoStyle} alt={`${petName}的照片`} />
            <div><p>{petName}的安心照护卡</p><span><HomeIcon size={12} /> {carePeriodLabel}</span><span><CalendarDays size={12} /> {expiryLabel}</span></div>
          </div>
          {theme === "trip" && <div className="trip-handoff-strip"><span>出发后首项交接</span><b>{startLabel} · 已确认</b><span>CARE FILE 01</span></div>}
          <div className="share-card-rule" />
          <div className="share-card-heading"><span>本次先做这 4 件事</span><small>CARE NOTES</small></div>
          <div className="share-task-list">
            {tasks.map((task, index) => <div className="share-task" key={task.label}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{task.label}</strong><p>{task.detail}</p></div></div>)}
          </div>
          <div className="share-warning"><span>请特别注意</span><p>{note}</p></div>
          <div className="share-card-footer">
            <div><p>需要时，先联系主人</p><b>{ownerName}</b><small>完整说明和物品位置请扫码查看</small></div>
            <div className="share-qr-panel">{qrData ? <img src={qrData} className="share-qr" alt="扫码查看完整照护说明" /> : <div className="share-qr-placeholder" />}<span>扫码查看<br />完整说明</span></div>
          </div>
          {theme === "daily" && <img src={SHARE_STICKER} className="share-cat-sticker" alt="" />}
        </div>
        {imageReady && <div className="image-ready"><CheckCircle2 size={17} /><span>图片已生成，可直接发给照护者。</span></div>}
        <div className="preview-controls">
          <button className="control-row" onClick={copyLink}><Copy size={18} /><span><b>复制网页版链接</b><small>适合发送给不方便扫码的人</small></span><ChevronRight size={17} /></button>
          <button className="control-row" onClick={() => setPage("caregiver")}><ExternalLink size={18} /><span><b>预览照护者视角</b><small>看看对方打开后会先看到什么</small></span><ChevronRight size={17} /></button>
          <button className="control-row danger" onClick={() => { setIsRevoked(true); setPage("revoked"); }}><TimerReset size={18} /><span><b>撤回这张交接卡</b><small>关闭后二维码将立即失效</small></span><ChevronRight size={17} /></button>
        </div>
      </main>
      <BottomBar>
        <button className="secondary-button" onClick={() => exportImage(false)} disabled={isRendering}><Download size={18} />{isRendering ? "正在生成…" : "保存图片"}</button>
        <button className="primary-button share-button" onClick={() => exportImage(true)} disabled={isRendering}><Send size={18} />发给照护者</button>
      </BottomBar>
    </div>
  );

  const renderCaregiver = () => (
    <div className="screen caregiver-screen">
      <header className="caregiver-top"><button onClick={() => setPage("preview")}><ArrowLeft size={19} /></button><span><TailCheckMark compact /><LockKeyhole size={13} /> 来自 {ownerName} 的限时交接卡</span><MoreHorizontal size={20} /></header>
      <main className="caregiver-main">
        <div className={`caregiver-pet-card theme-${theme}`}><img src={isCustomPhoto ? petPhoto : PET_MORNING} style={isCustomPhoto ? photoStyle : undefined} alt={`${petName}的照片`} /><div className="caregiver-pet-overlay"><TinyStamp tone="sage"><TailCheckMark compact /> {themes[theme].cardLabel} · {petName}<b>{tasks.length.toString().padStart(2, "0")} 项待完成</b></TinyStamp><h1>开始照看后，先完成这 4 项</h1><p><b>CARE 01—04</b> · {carePeriodLabel}</p></div></div>
        <div className="caregiver-file-strip"><span><TailCheckMark compact /> 来自 {ownerName} 的照护交接</span><b>{expiryLabel}</b></div>
        <section className="caregiver-section"><div className="section-heading"><span>本次照护</span><small>{doneTasks.length}/4 已完成</small></div>
          <div className="caregiver-task-list">{tasks.map((task, index) => <button className={`caregiver-task ${doneTasks.includes(index) ? "is-done" : ""}`} key={task.label} onClick={() => toggleTask(index)}><span className="caregiver-task-check">{doneTasks.includes(index) ? <Check size={17} /> : String(index + 1).padStart(2, "0")}</span><div><strong>{task.label}</strong><p>{task.detail}</p></div><TaskIcon type={task.icon} /></button>)}</div>
        </section>
        <section className="caregiver-alert"><div className="alert-icon"><HeartHandshake size={19} /></div><div><span>特别注意</span><p>{note}</p></div></section>
        <section className="contact-block"><div><span>需要确认时</span><b>先联系 {ownerName}</b></div><button onClick={() => toast.success("已打开联系入口", { description: "正式版将通过主人设置的安全联系方式发起联系。" })}>联系主人</button></section>
      </main>
      <div className="caregiver-foot"><ShieldCheck size={14} /><span>这张交接卡将在 {expiryLabel.replace("前有效", "后自动收好")}</span></div>
    </div>
  );

  const renderRevoked = () => (
    <div className="screen revoked-screen">
      <div className="revoked-illustration"><TailCheckMark /><span><X size={17} /></span></div>
      <TinyStamp tone="ink">交接已结束</TinyStamp>
      <h1>这张照护卡已经<br />被主人收好了。</h1>
      <p>为了保护宠物和主人的信息，二维码和网页说明都不再可见。</p>
      <button className="primary-button" onClick={() => { setIsRevoked(false); setPage("welcome"); }}><RotateCcw size={18} />回到首页</button>
    </div>
  );

  if (isRevoked && page !== "revoked") return renderRevoked();
  if (page === "create") return renderCreate();
  if (page === "preview") return renderPreview();
  if (page === "caregiver") return renderCaregiver();
  if (page === "revoked") return renderRevoked();
  return renderWelcome();
}
