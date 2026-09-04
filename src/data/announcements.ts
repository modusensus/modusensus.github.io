/**
 * 首页公告卡片数据。日期格式 YYYY.MM.DD，保持最新在前。
 */
export interface Announcement {
  date: string;
  text: string;
}

export const announcements: Announcement[] = [
  { date: '2026.09.04', text: 'AI 助理功能开发中，暂时停用。右下角对话浮窗已下线，正式上线后再公告。' },
  { date: '2026.09.04', text: 'STUDIO 工作室看板上线：服务包、进行中项目与合作方式一站可见，主页封面新增 BLOG / STUDIO 双入口。' },
  { date: '2026.09.04', text: '品牌邮箱上线：hi@modusensus.space 正式启用，页脚 Email 即可直达；ARCHIVE 新增档案笔记《把 @modusensus.space 刻成自己的门牌号》记录全流程。' },
  { date: '2026.09.03', text: '《长沙 6 座湿地公园，开车 30 分钟能覆盖多少人？》研究报告上线，FIELDWORK 空间研究首篇。' },
  { date: '2026.09.03', text: 'LAB 栏目开放：FIELDWORK / LOGS / BUILDS 三个子专栏上线。' },
];
