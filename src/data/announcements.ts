/**
 * 首页公告卡片数据。日期格式 YYYY.MM.DD，保持最新在前。
 */
export interface Announcement {
  date: string;
  text: string;
}

export const announcements: Announcement[] = [
  { date: '2026.09.03', text: '《长沙 6 座湿地公园，开车 30 分钟能覆盖多少人？》研究报告上线，FIELDWORK 空间研究首篇。' },
  { date: '2026.09.03', text: 'LAB 栏目开放：FIELDWORK / LOGS / BUILDS 三个子专栏上线。' },
  { date: '2026.09.01', text: '主页改版：站点统计、分区总览、文章标签上线，公告改为明信片卡片。' },
  { date: '2026.09.01', text: '新文章《傲慢的两种面孔》发布（THRESHOLD NOTES No.02）。' },
];
