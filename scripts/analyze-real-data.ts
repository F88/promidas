import { readFileSync } from 'node:fs';

type RawPrototype = {
  id: number;
  prototypeNm: string;
  tags?: string;
  users: string;
  viewCount: number;
  goodCount: number;
  commentCount: number;
  createDate: string;
  updateDate: string;
  status: number;
  releaseFlg: number;
};

const data: RawPrototype[] = JSON.parse(
  readFileSync('./prototypes-10000.json', 'utf-8'),
);

console.log('=== Basic Statistics ===');
console.log(`Total prototypes: ${data.length}`);
console.log(
  `ID range: ${Math.min(...data.map((p) => p.id))} - ${Math.max(...data.map((p) => p.id))}`,
);

// Tag analysis
const tagCounts = new Map<string, number>();
const taggedCount = data.filter((p) => p.tags).length;
data.forEach((p) => {
  if (p.tags) {
    const tags = p.tags.split('|');
    tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  }
});

console.log(`\n=== Tag Statistics ===`);
console.log(
  `Prototypes with tags: ${taggedCount} (${((taggedCount / data.length) * 100).toFixed(1)}%)`,
);
console.log(`Unique tags: ${tagCounts.size}`);
console.log(`\nTop 10 tags:`);
Array.from(tagCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([tag, count], i) => {
    console.log(`  ${i + 1}. ${tag}: ${count}`);
  });

// User analysis
const userCounts = new Map<string, number>();
data.forEach((p) => {
  if (p.users) {
    const users = p.users.split('|');
    users.forEach((user) => {
      userCounts.set(user, (userCounts.get(user) || 0) + 1);
    });
  }
});

console.log(`\n=== User Statistics ===`);
console.log(`Unique users: ${userCounts.size}`);
console.log(`\nTop 10 most active users:`);
Array.from(userCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([user, count], i) => {
    console.log(`  ${i + 1}. ${user}: ${count} prototypes`);
  });

// View/Good/Comment statistics
const viewStats = {
  total: data.reduce((sum, p) => sum + p.viewCount, 0),
  avg: 0,
  min: Math.min(...data.map((p) => p.viewCount)),
  max: Math.max(...data.map((p) => p.viewCount)),
};
viewStats.avg = viewStats.total / data.length;

const goodStats = {
  total: data.reduce((sum, p) => sum + p.goodCount, 0),
  avg: 0,
  min: Math.min(...data.map((p) => p.goodCount)),
  max: Math.max(...data.map((p) => p.goodCount)),
};
goodStats.avg = goodStats.total / data.length;

const commentStats = {
  total: data.reduce((sum, p) => sum + p.commentCount, 0),
  avg: 0,
  min: Math.min(...data.map((p) => p.commentCount)),
  max: Math.max(...data.map((p) => p.commentCount)),
};
commentStats.avg = commentStats.total / data.length;

console.log(`\n=== Engagement Statistics ===`);
console.log(
  `View count - Total: ${viewStats.total}, Avg: ${viewStats.avg.toFixed(1)}, Min: ${viewStats.min}, Max: ${viewStats.max}`,
);
console.log(
  `Good count - Total: ${goodStats.total}, Avg: ${goodStats.avg.toFixed(1)}, Min: ${goodStats.min}, Max: ${goodStats.max}`,
);
console.log(
  `Comment count - Total: ${commentStats.total}, Avg: ${commentStats.avg.toFixed(1)}, Min: ${commentStats.min}, Max: ${commentStats.max}`,
);

// Status analysis
const statusCounts = new Map<number, number>();
data.forEach((p) => {
  statusCounts.set(p.status, (statusCounts.get(p.status) || 0) + 1);
});

console.log(`\n=== Status Distribution ===`);
Array.from(statusCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => {
    console.log(
      `  Status ${status}: ${count} (${((count / data.length) * 100).toFixed(1)}%)`,
    );
  });
