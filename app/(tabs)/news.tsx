import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

interface Article {
  id: string;
  title: string;
  source: string;
  date: string;
  rawDate: number;
  snippet: string;
  url: string;
  isEvent?: boolean;
}

// ── RSS Feeds ──

const RSS_FEEDS = [
  { name: 'Dysautonomia International', url: 'https://dysautonomiainternational.org/blog/wordpress/feed/' },
  { name: 'The Dysautonomia Project', url: 'https://thedysautonomiaproject.org/feed/' },
  { name: 'Health Rising', url: 'https://www.healthrising.org/feed/' },
];

const RSS_PROXY = '/api/rss?url=';

// ── Conference Events (manually curated — update periodically) ──

const CONFERENCE_EVENTS: Article[] = [
  {
    id: 'event-advocacy-week-2026',
    title: 'Dysautonomia Advocacy Week 2026',
    source: 'Event',
    date: 'Mar 3-6, 2026',
    rawDate: new Date('2026-03-03').getTime(),
    snippet: 'Virtual advocacy event across the United States. Connect with legislators and advocate for dysautonomia research funding.',
    url: 'https://dysautonomiainternational.salsalabs.org/2026advocacyweek/',
    isEvent: true,
  },
  {
    id: 'event-race-to-beat-pots-2026',
    title: 'Race to Beat POTS 2026',
    source: 'Event',
    date: 'May 31, 2026',
    rawDate: new Date('2026-05-31').getTime(),
    snippet: 'Annual walk/run in West Chester, PA and virtual. Fundraising and awareness event for POTS research.',
    url: 'https://potswalk.org',
    isEvent: true,
  },
  {
    id: 'event-dysintl-conf-2026',
    title: 'Dysautonomia International Annual Conference 2026',
    source: 'Conference',
    date: 'Jul 9-12, 2026',
    rawDate: new Date('2026-07-09').getTime(),
    snippet: 'Annual patient and researcher conference in Houston, TX. Presentations on latest POTS research, treatments, and coping strategies.',
    url: 'https://dysconf.org',
    isEvent: true,
  },
  {
    id: 'event-awareness-month-2026',
    title: 'Dysautonomia Awareness Month',
    source: 'Awareness',
    date: 'Oct 2026',
    rawDate: new Date('2026-10-01').getTime(),
    snippet: 'October is Dysautonomia Awareness Month. Share your story and help spread awareness about POTS and other forms of dysautonomia.',
    url: 'https://www.dysautonomiainternational.org/page.php?ID=34',
    isEvent: true,
  },
  {
    id: 'event-ans-2026',
    title: 'American Autonomic Society Annual Meeting 2026',
    source: 'Conference',
    date: 'Nov 2026',
    rawDate: new Date('2026-11-14').getTime(),
    snippet: 'Scientific meeting focused on autonomic nervous system disorders. Leading researchers present latest findings on POTS and dysautonomia.',
    url: 'https://www.americanautonomicsociety.org/',
    isEvent: true,
  },
];

// ── Helpers ──

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function parseRssXml(xml: string, sourceName: string): Article[] {
  const articles: Article[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let i = 0;
  while ((match = itemRegex.exec(xml)) !== null && i < 10) {
    const itemXml = match[1];
    const title = stripHtml(extractTag(itemXml, 'title'));
    const link = stripHtml(extractTag(itemXml, 'link'));
    const pubDate = stripHtml(extractTag(itemXml, 'pubDate'));
    const description = extractTag(itemXml, 'description');
    const snippet = truncate(stripHtml(description), 150);
    if (title) {
      const rawDate = pubDate ? new Date(pubDate).getTime() : 0;
      articles.push({
        id: `${sourceName}-${i}`,
        title, source: sourceName, date: formatDate(pubDate),
        rawDate: isNaN(rawDate) ? 0 : rawDate, snippet, url: link,
      });
      i++;
    }
  }
  return articles;
}

async function fetchFeed(feed: { name: string; url: string }): Promise<Article[]> {
  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(feed.url)}`);
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes('<item>')) return [];
    return parseRssXml(xml, feed.name);
  } catch { return []; }
}

async function fetchAllFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const articles: Article[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') articles.push(...result.value);
  }
  // Add upcoming conference events (only future ones)
  const now = Date.now();
  const upcomingEvents = CONFERENCE_EVENTS.filter((e) => e.rawDate > now);
  articles.push(...upcomingEvents);

  articles.sort((a, b) => b.rawDate - a.rawDate);
  return articles;
}

// ── Component ──

export default function NewsScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'news' | 'events' | 'saved'>('news');

  // Load saved/hidden from Firestore
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const data = snap.data();
      if (data?.newsPrefs?.saved) setSavedIds(new Set(data.newsPrefs.saved));
      if (data?.newsPrefs?.hidden) setHiddenIds(new Set(data.newsPrefs.hidden));
    }).catch(() => {});
  }, []);

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const data = await fetchAllFeeds();
      setArticles(data);
      const hasNews = data.some((a) => !a.isEvent);
      if (data.length === 0) setError(true);
      else if (!hasNews && !isRefresh) setFilter('events'); // auto-show events if RSS feeds failed
    } catch { setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  const savePrefs = (saved: Set<string>, hidden: Set<string>) => {
    const user = getCurrentUser();
    if (!user) return;
    setDoc(doc(db, 'users', user.uid), {
      newsPrefs: { saved: Array.from(saved), hidden: Array.from(hidden) },
    }, { merge: true }).catch(() => {});
  };

  const toggleSave = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSavedIds(next);
    savePrefs(next, hiddenIds);
  };

  const hideArticle = (id: string) => {
    const next = new Set(hiddenIds);
    next.add(id);
    setHiddenIds(next);
    savePrefs(savedIds, next);
  };

  const shareArticle = async (article: Article) => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: article.title, url: article.url });
        } else {
          await navigator.clipboard.writeText(article.url);
          window.alert('Link copied to clipboard!');
        }
      } else {
        await Share.share({ message: `${article.title}\n${article.url}` });
      }
    } catch {}
  };

  const filteredArticles = articles.filter((a) => {
    if (hiddenIds.has(a.id)) return false;
    if (filter === 'news') return !a.isEvent;
    if (filter === 'events') return a.isEvent;
    if (filter === 'saved') return savedIds.has(a.id);
    return true;
  });

  const renderArticle = ({ item }: { item: Article }) => {
    const isSaved = savedIds.has(item.id);
    return (
      <Pressable
        style={[styles.card, item.isEvent && styles.eventCard]}
        onPress={() => item.url && Linking.openURL(item.url)}
      >
        {item.isEvent && (
          <View style={styles.eventBadge}>
            <Ionicons name="calendar" size={12} color={Colors.primary} />
            <Text style={styles.eventBadgeText}>EVENT</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.snippet ? (
          <Text style={styles.cardSnippet} numberOfLines={3}>{item.snippet}</Text>
        ) : null}

        {/* Footer: source + date + action buttons */}
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardSource}>{item.source}</Text>
            {item.date ? <Text style={styles.cardDate}>{item.date}</Text> : null}
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => toggleSave(item.id)} hitSlop={8}>
              <Ionicons
                name={isSaved ? 'star' : 'star-outline'}
                size={18}
                color={isSaved ? Colors.premium : Colors.textMuted}
              />
            </Pressable>
            <Pressable onPress={() => shareArticle(item)} hitSlop={8}>
              <Ionicons name="share-outline" size={18} color={Colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => hideArticle(item.id)} hitSlop={8}>
              <Ionicons name="eye-off-outline" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticle}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNews(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.header}>POTS & Dysautonomia News</Text>
            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {(['news', 'events', 'saved'] as const).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'news' ? 'News' : f === 'events' ? 'Events' : 'Saved'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading news...</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>Unable to load news right now.</Text>
              <Pressable style={styles.retryBtn} onPress={() => loadNews()}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : filter === 'saved' ? (
            <View style={styles.centered}>
              <Ionicons name="star-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved articles yet</Text>
              <Text style={styles.emptySubtext}>Tap the star on any article to save it</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          filteredArticles.length > 0 ? (
            <Text style={styles.footer}>
              Sources: Dysautonomia International, The Dysautonomia Project, Health Rising
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 80 },
  header: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: Colors.text },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCard: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  eventBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardPressed: { opacity: 0.7 },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 20 },
  cardSnippet: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 10 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: { flex: 1 },
  cardSource: { color: Colors.primary, fontSize: 12, fontWeight: '500' },
  cardDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },

  centered: { alignItems: 'center', paddingTop: 60 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 12 },
  errorText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  retryBtn: {
    backgroundColor: Colors.card, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  retryText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  footer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
