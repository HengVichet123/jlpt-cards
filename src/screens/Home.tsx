/* Home: title, Study tiles, Library tiles. Taps are handled by the app's existing [data-home] listener. */
type Props = { ja: boolean; due: string };

const GEAR = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4Z" />
  </svg>
);

const JLPT = [   // v170: the JLPT-style tests have their own group
  { id: "readtests", cls: "cover-read", jp: "読", name: "Reading", sub: "読解" },
  { id: "listening", cls: "cover-list", jp: "聴", name: "Listening", sub: "聴解" },
  { id: "vocab", cls: "cover-all", jp: "語", name: "Vocab & Grammar", sub: "言語知識" },
] as const;

const LIBRARY = [
  { id: "reading", jp: "本", name: "Books" },   // news, articles, novels, stories, literature
  { id: "novels", jp: "映", name: "Movies" },
  { id: "pictures", jp: "図", name: "Pictures" },
  { id: "illust", jp: "描", name: "Illustrations" },
  { id: "sections", jp: "節", name: "Sections" },
  { id: "useit", jp: "使", name: "Use it" },
  { id: "scenes", jp: "絵", name: "Scenes" },
  { id: "photos", jp: "写", name: "Photos" },
  { id: "explore", jp: "探", name: "Explorer" },
  { id: null, jp: "商", name: "Business" },   // coming later
] as const;

export function Home({ ja, due }: Props) {
  return (
    <section className="home">
      <h1>記憶の宮殿</h1>
      <p className="home-goal">{ja ? "選んだことを、いろいろな方法で身につける場所。" : "What you choose to learn, learned every way."}</p>
      <button className="home-gear" type="button" data-home="settings" aria-label="Settings">{GEAR}</button>

      <h2 className="home-h">Study</h2>
      <div className="core core-2">
        <button className="cover cover-play" data-home="playground"><i>練</i><b>Practice</b><span>{due}</span></button>
        <button className="cover cover-cards" data-home="complete"><i>覧</i><b>Complete list</b><span>Every card, in order</span></button>
      </div>

      <div className="core core-3">
        {JLPT.map(t => (
          <button key={t.id} className={`cover ${t.cls}`} data-home={t.id}>
            <i>{t.jp}</i><b>{t.name}</b><span>{t.sub}</span>
          </button>
        ))}
      </div>

      <h2 className="home-h">Library</h2>
      <div className="side">
        {LIBRARY.map(t => t.id
          ? <button key={t.id} className="side-tile" data-home={t.id}><i>{t.jp}</i><b>{t.name}</b></button>
          : <button key={t.name} className="side-tile soon" disabled><i>{t.jp}</i><b>{t.name}</b></button>)}
      </div>
    </section>
  );
}
