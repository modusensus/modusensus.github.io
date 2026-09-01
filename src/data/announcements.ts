/**
 * 首页公告卡片数据。日期格式 YYYY.MM.DD，保持最新在前。
 */
export interface Announcement {
  date: string;
  text: string;
}

export const announcements: Announcement[] = [
  { date: '2026.09.01', text: '主页改版：站点统计、分区总览、文章标签上线，公告改为明信片卡片。' },
  { date: '2026.09.01', text: '新文章《傲慢的两种面孔》发布（THRESHOLD NOTES No.02）。' },
  { date: '2026.08.30', text: 'V3 界面更新：明暗主题切换上线，首页改为站点面板。' },
  { date: '2026.08.29', text: 'Fragments / Elsewhere / Guestbook 三个新栏目开放。' },
];
