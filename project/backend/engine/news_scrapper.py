"""
news_scrapper.py - Scrape news headlines from CNBC

This module uses requests + BeautifulSoup and Playwright to scrape financial news from CNBC.

Note: Many sites have anti-bot protection. If scraping fails, consider:
1. Using news APIs instead (see news_fetcher.py)
2. Using a headless browser like Playwright or Selenium
"""

from bs4 import BeautifulSoup
import requests
import json
import os
import sys
from datetime import datetime
import time
from typing import List, Dict, Any

# Fix UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


# Common headers to mimic a real browser
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def fetch_article_content(url):
    """
    Fetch the full article content from a CNBC article URL.
    
    Args:
        url: The article URL to fetch
        
    Returns:
        dict: Contains 'title', 'content', 'author', 'published_date', 'url'
    """
    try:
        print(f"[NewsScrapper] Fetching article: {url}")
        response = requests.get(url, headers=BROWSER_HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Extract title
        title = ""
        title_selectors = [
            "h1.ArticleHeader-headline",
            "h1[itemprop='headline']",
            "h1[class*='headline']",
            "h1",
        ]
        for selector in title_selectors:
            elem = soup.select_one(selector)
            if elem:
                title = elem.get_text(strip=True)
                break
        
        # Extract author
        author = ""
        author_selectors = [
            "a[href*='/pro/'] .Author-authorName",
            ".ArticleHeader-author",
            "span[itemprop='author']",
            "a.Author-authorName",
            ".ArticleBody-author",
        ]
        for selector in author_selectors:
            elem = soup.select_one(selector)
            if elem:
                author = elem.get_text(strip=True)
                break
        
        # Extract published date
        published_date = ""
        date_selectors = [
            "time[datetime]",
            "span[class*='timestamp']",
            ".ArticleHeader-time",
            "meta[itemprop='datePublished']",
        ]
        for selector in date_selectors:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == "meta":
                    published_date = elem.get("content", "")
                else:
                    published_date = elem.get("datetime", "") or elem.get_text(strip=True)
                break
        
        # Extract article content
        content = ""
        content_selectors = [
            "div.ArticleBody-articleBody",
            "div[class*='article-body']",
            "div[itemprop='articleBody']",
            "article",
            "div[class*='content']",
        ]
        
        for selector in content_selectors:
            elem = soup.select_one(selector)
            if elem:
                # Get all paragraphs
                paragraphs = elem.find_all("p")
                if paragraphs:
                    content = "\n\n".join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                else:
                    content = elem.get_text(strip=True)
                break
        
        article_data = {
            "title": title,
            "content": content,
            "author": author,
            "published_date": published_date,
            "url": url,
            "scraped_at": datetime.now().isoformat()
        }
        
        print(f"[NewsScrapper] Successfully fetched article: {title[:60]}...")
        return article_data
        
    except Exception as e:
        print(f"[NewsScrapper] Error fetching article {url}: {e}")
        return {
            "title": "",
            "content": "",
            "author": "",
            "published_date": "",
            "url": url,
            "error": str(e),
            "scraped_at": datetime.now().isoformat()
        }


def scrape_cnbc_playwright(max_headlines=100, scroll_count=3, fetch_articles=False):
    """
    Scrape news headlines from CNBC Investing using Playwright.
    This allows scrolling to load more content dynamically.

    Args:
        max_headlines: Maximum number of headlines to return
        scroll_count: Number of times to scroll down to load more content
        fetch_articles: If True, also fetch the full article content for each headline

    Returns:
        list: List of dicts with headline info (and article content if fetch_articles=True)
    """
    url = "https://www.cnbc.com/investing/"

    try:
        from playwright.sync_api import sync_playwright

        print(f"[NewsScrapper] Fetching CNBC with Playwright: {url}")

        with sync_playwright() as p:
            # Launch browser in headless mode
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=BROWSER_HEADERS["User-Agent"],
                viewport={"width": 1920, "height": 1080}
            )
            page = context.new_page()

            # Navigate to the page
            print(f"[NewsScrapper] Loading page...")
            page.goto(url, wait_until="networkidle", timeout=30000)

            # Accept cookies if there's a banner
            try:
                cookie_btn = page.locator("button:has-text('Accept'), button:has-text('I Accept'), button:has-text('Agree')").first
                if cookie_btn.is_visible(timeout=5000):
                    cookie_btn.click()
                    print(f"[NewsScrapper] Accepted cookies")
                    time.sleep(1)
            except:
                pass

            # Scroll to load more content
            print(f"[NewsScrapper] Scrolling {scroll_count} times to load more content...")
            for i in range(scroll_count):
                # Scroll to bottom
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)  # Wait for content to load
                print(f"[NewsScrapper] Scroll {i+1}/{scroll_count} complete")

            # Get the page content after scrolling
            html_content = page.content()
            browser.close()

        # Parse with BeautifulSoup
        soup = BeautifulSoup(html_content, "html.parser")
        headlines = []

        # CNBC uses various selectors
        selectors = [
            "a.Card-title",
            "h3.Card-title a",
            "h2.Card-title a",
            "h4.Card-title a",
            "a.LatestNews-headline",
            "a[href^='https://www.cnbc.com/202']",
            "a[href^='https://www.cnbc.com/2024']",
            "a[href^='https://www.cnbc.com/2025']",
            ".RiverHeadline-headline",
            ".RiverHeadline-headline a",
            "h3 a",
            "h2 a",
            "h4 a",
            ".card-title",
            ".Card-title",
            "a[data-test='card-title']",
            "a[data-test='river-headline']",
            ".LatestNews-headline",
            "[data-test='latest-news-headline']",
        ]

        for selector in selectors:
            if len(headlines) >= max_headlines:
                break
            elements = soup.select(selector)
            for elem in elements:
                if len(headlines) >= max_headlines:
                    break

                # Get title and link
                if elem.name == "a":
                    title = elem.get_text(strip=True)
                    href = elem.get("href", "")
                else:
                    title = elem.get_text(strip=True)
                    link_elem = elem if elem.name == "a" else elem.find("a")
                    if not link_elem:
                        link_elem = elem.find_parent("a")
                    href = link_elem.get("href", "") if link_elem else ""

                # Filter out non-article links
                if title and len(title) > 15 and ("cnbc.com" in str(href) or href.startswith("/")):
                    # Ensure full URL
                    if href.startswith("/"):
                        href = f"https://www.cnbc.com{href}"

                    if not any(h["title"] == title for h in headlines):
                        headlines.append({
                            "source": "CNBC",
                            "title": title,
                            "url": href,
                            "timestamp": datetime.now().isoformat()
                        })

        print(f"[NewsScrapper] Found {len(headlines)} headlines from CNBC")
        return headlines[:max_headlines]

    except ImportError:
        print(f"[NewsScrapper] Playwright not installed. Install with: pip install playwright")
        print(f"[NewsScrapper] Then run: playwright install chromium")
        # Fallback to requests-based scraper
        return scrape_cnbc_requests(max_headlines)
    except Exception as e:
        print(f"[NewsScrapper] Error scraping CNBC with Playwright: {e}")
        # Fallback to requests-based scraper
        return scrape_cnbc_requests(max_headlines)


def scrape_cnbc(max_headlines=100, use_playwright=True, scroll_count=5):
    """
    Scrape news headlines from CNBC Investing.

    Args:
        max_headlines: Maximum number of headlines to return
        use_playwright: If True, use Playwright for JavaScript rendering and scrolling
        scroll_count: Number of times to scroll when using Playwright

    Returns:
        list: List of dicts with headline info
    """
    if use_playwright:
        try:
            return scrape_cnbc_playwright(max_headlines, scroll_count)
        except Exception as e:
            print(f"[NewsScrapper] Playwright failed, falling back to requests: {e}")
            return scrape_cnbc_requests(max_headlines)
    else:
        return scrape_cnbc_requests(max_headlines)


def scrape_cnbc_requests(max_headlines=100):
    """
    Scrape news headlines from CNBC Investing using requests/BeautifulSoup.
    Fallback method when Playwright is not available.

    Args:
        max_headlines: Maximum number of headlines to return

    Returns:
        list: List of dicts with headline info
    """
    url = "https://www.cnbc.com/investing/"

    try:
        print(f"[NewsScrapper] Fetching CNBC: {url}")
        response = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")
        headlines = []

        # CNBC uses various selectors - expanded to catch more headlines
        selectors = [
            "a.Card-title",
            "h3.Card-title a",
            "h2.Card-title a",
            "h4.Card-title a",
            "a.LatestNews-headline",
            "a[href^='https://www.cnbc.com/202']",
            "a[href^='https://www.cnbc.com/2024']",
            "a[href^='https://www.cnbc.com/2025']",
            ".RiverHeadline-headline",
            ".RiverHeadline-headline a",
            "h3 a",
            "h2 a",
            "h4 a",
            ".card-title",
            ".Card-title",
            "a[data-test='card-title']",
            "a[data-test='river-headline']",
            ".LatestNews-headline",
            "[data-test='latest-news-headline']",
        ]

        # Also find all article links directly
        article_links = soup.find_all("a", href=lambda x: x and "/202" in x and "cnbc.com" in x)

        for selector in selectors:
            if len(headlines) >= max_headlines:
                break
            elements = soup.select(selector)
            for elem in elements:
                if len(headlines) >= max_headlines:
                    break

                # Get title and link
                if elem.name == "a":
                    title = elem.get_text(strip=True)
                    href = elem.get("href", "")
                else:
                    title = elem.get_text(strip=True)
                    link_elem = elem if elem.name == "a" else elem.find("a")
                    if not link_elem:
                        link_elem = elem.find_parent("a")
                    href = link_elem.get("href", "") if link_elem else ""

                # Filter out non-article links
                if title and len(title) > 15 and ("cnbc.com" in str(href) or href.startswith("/")):
                    # Ensure full URL
                    if href.startswith("/"):
                        href = f"https://www.cnbc.com{href}"

                    if not any(h["title"] == title for h in headlines):
                        headlines.append({
                            "source": "CNBC",
                            "title": title,
                            "url": href,
                            "timestamp": datetime.now().isoformat()
                        })

        # Also process article links found directly
        for link in article_links:
            if len(headlines) >= max_headlines:
                break
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if title and len(title) > 15 and href and "cnbc.com" in href:
                if not any(h["title"] == title for h in headlines):
                    headlines.append({
                        "source": "CNBC",
                        "title": title,
                        "url": href,
                        "timestamp": datetime.now().isoformat()
                    })

        print(f"[NewsScrapper] Found {len(headlines)} headlines from CNBC")
        return headlines[:max_headlines]

    except Exception as e:
        print(f"[NewsScrapper] Error scraping CNBC: {e}")
        return []


def scrape_cnbc_with_articles(max_headlines=10, use_playwright=True, scroll_count=3):
    """
    Scrape CNBC headlines and fetch full article content for each.
    
    This is a convenience function that combines scrape_cnbc() with fetch_article_content()
    to get both headlines and full article content in one call.
    
    Args:
        max_headlines: Maximum number of headlines/articles to return
        use_playwright: If True, use Playwright for JavaScript rendering
        scroll_count: Number of times to scroll when using Playwright
        
    Returns:
        list: List of dicts containing headline info and full article content
              Each dict has: title, url, author, published_date, content, source
    """
    print(f"[NewsScrapper] Scraping {max_headlines} CNBC articles with full content...")
    
    # First, get the headlines
    headlines = scrape_cnbc(max_headlines=max_headlines, use_playwright=use_playwright, scroll_count=scroll_count)
    
    if not headlines:
        print("[NewsScrapper] No headlines found")
        return []
    
    # Now fetch full content for each article
    articles_with_content = []
    
    for i, headline in enumerate(headlines, 1):
        print(f"\n[NewsScrapper] Fetching article {i}/{len(headlines)}: {headline['title'][:50]}...")
        
        article_data = fetch_article_content(headline['url'])
        
        if article_data.get('content'):
            articles_with_content.append(article_data)
            print(f"[NewsScrapper] Successfully fetched article ({len(article_data['content'])} chars)")
        else:
            # If we couldn't get content, at least include the headline info
            articles_with_content.append({
                'title': headline['title'],
                'url': headline['url'],
                'content': '',
                'author': '',
                'published_date': '',
                'source': 'CNBC',
                'scraped_at': datetime.now().isoformat()
            })
            print(f"[NewsScrapper] Could not fetch full content, using headline only")
    
    print(f"\n[NewsScrapper] Completed! Fetched {len(articles_with_content)} articles with content")
    return articles_with_content


def scrape_all(max_headlines_per_source=50):
    """
    Scrape news from all available sources.

    Args:
        max_headlines_per_source: Maximum headlines to fetch per source

    Returns:
        dict: Dictionary with source names as keys and headline lists as values
    """
    results = {
        "cnbc": [],
    }

    print("\n" + "="*60)
    print("SCRAPING ALL SOURCES")
    print("="*60)

    # Scrape CNBC
    results["cnbc"] = scrape_cnbc(max_headlines_per_source)

    # Print summary
    print("\n" + "="*60)
    print("SCRAPING SUMMARY")
    print("="*60)
    total = 0
    for source, headlines in results.items():
        count = len(headlines)
        total += count
        print(f"  {source.replace('_', ' ').title()}: {count} headlines")
    print(f"  TOTAL: {total} headlines")
    print("="*60)

    return results


def transform_cnbc_to_news_format(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform CNBC article format to standard news format for news processor.
    """
    transformed = []

    for i, article in enumerate(articles):
        if not article.get('title'):
            continue

        article_id = f"cnbc_{datetime.now().strftime('%Y%m%d')}_{i}_{hash(article['title']) % 10000}"
        summary = article.get('content', '')[:300] + '...' if article.get('content') else article['title']

        transformed.append({
            'uuid': article_id,
            'title': article['title'],
            'summary': summary,
            'content': article.get('content', ''),
            'author': article.get('author', ''),
            'published_date': article.get('published_date', ''),
            'url': article['url'],
            'source': 'CNBC',
            'related_tickers': [],
            'fetched_at': datetime.now().isoformat()
        })

    return transformed


def analyze_cnbc_signals(articles: List[Dict[str, Any]], verbose: bool = True) -> Dict[str, Any]:
    """
    Analyze CNBC articles and generate trading signals.
    """
    from engine.news_processor import process_articles

    if verbose:
        print("\n" + "="*70)
        print("CNBC NEWS SIGNAL ANALYSIS")
        print("="*70)

    if verbose:
        print(f"\n[Step 1] Transforming {len(articles)} CNBC articles...")

    news_format_articles = transform_cnbc_to_news_format(articles)

    if verbose:
        print(f"  Transformed {len(news_format_articles)} articles")

    if verbose:
        print(f"\n[Step 2] Processing through signal engine...")

    processed_data = process_articles(news_format_articles)

    analyzed_articles = processed_data['articles']
    by_ticker = processed_data['by_ticker']

    if verbose:
        print(f"  Analyzed {len(analyzed_articles)} articles")
        print(f"  Found signals for {len(by_ticker)} tickers")

    if verbose:
        print(f"\n[Step 3] Generating signal summary...")

    signal_counts = {'BULLISH': 0, 'BEARISH': 0, 'NEUTRAL': 0}
    ticker_signals = {}

    for article in analyzed_articles:
        signal = article.get('signal', 'NEUTRAL')
        signal_counts[signal] = signal_counts.get(signal, 0) + 1

        for stock in article.get('stocks', []):
            ticker = stock.get('ticker')
            if not ticker:
                continue

            if ticker not in ticker_signals:
                ticker_signals[ticker] = {
                    'ticker': ticker,
                    'name': stock.get('name', ticker),
                    'sector': stock.get('sector', 'unknown'),
                    'signals': [],
                    'articles': []
                }

            ticker_signals[ticker]['signals'].append({
                'signal': signal,
                'score': article.get('score', 0),
                'confidence': article.get('confidence', 0)
            })
            ticker_signals[ticker]['articles'].append({
                'title': article.get('title', ''),
                'signal': signal,
                'url': article.get('url', '')
            })

    for ticker, data in ticker_signals.items():
        signals = data['signals']
        if not signals:
            continue

        avg_score = sum(s['score'] for s in signals) / len(signals)
        avg_confidence = sum(s['confidence'] for s in signals) / len(signals)

        bullish_count = sum(1 for s in signals if s['signal'] == 'BULLISH')
        bearish_count = sum(1 for s in signals if s['signal'] == 'BEARISH')

        if bullish_count > bearish_count:
            overall_signal = 'BULLISH'
        elif bearish_count > bullish_count:
            overall_signal = 'BEARISH'
        else:
            overall_signal = 'NEUTRAL'

        data['aggregate'] = {
            'signal': overall_signal,
            'score': round(avg_score, 2),
            'confidence': round(avg_confidence, 2),
            'bullish_count': bullish_count,
            'bearish_count': bearish_count,
            'total_signals': len(signals)
        }

    if verbose:
        print(f"  Generated signals for {len(ticker_signals)} tickers")
        print(f"\nSignal Summary:")
        print(f"  - BULLISH: {signal_counts['BULLISH']}")
        print(f"  - BEARISH: {signal_counts['BEARISH']}")
        print(f"  - NEUTRAL: {signal_counts['NEUTRAL']}")

    return {
        'articles': analyzed_articles,
        'by_ticker': by_ticker,
        'ticker_signals': list(ticker_signals.values()),
        'summary': {
            'total_articles': len(analyzed_articles),
            'signal_counts': signal_counts,
            'tickers_with_signals': len(ticker_signals)
        }
    }


def save_signals_to_json(signals_data: Dict[str, Any], filename: str = "news_signals.json", output_dir: str = None):
    """
    Save news signals to JSON file for dashboard consumption.

    Args:
        signals_data: Dictionary containing signals and analysis
        filename: Output filename
        output_dir: Output directory (defaults to project/frontend/public/output)
    """
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', 'output')

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)

    output_data = {
        'generated_at': datetime.now().isoformat(),
        'source': 'CNBC News Scraper + Signal Engine',
        'data': signals_data
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nNews signals saved to: {output_path}")


def run_cnbc_pipeline(max_headlines: int = 15, use_playwright: bool = False, output_filename: str = "news_signals.json", verbose: bool = True) -> Dict[str, Any]:
    """
    Run the complete CNBC scraping and signal analysis pipeline.

    This is the main entry point that combines scraping, signal analysis, and saving.

    Args:
        max_headlines: Number of articles to fetch
        use_playwright: Whether to use Playwright for scraping
        output_filename: Output JSON filename
        verbose: Whether to print progress

    Returns:
        Dict containing the signal analysis results
    """
    if verbose:
        print("="*70)
        print("CNBC NEWS SCRAPER + SIGNAL INTEGRATION")
        print("="*70)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Configuration:")
        print(f"  - Articles to fetch: {max_headlines}")
        print(f"  - Use Playwright: {use_playwright}")
        print(f"  - Output file: {output_filename}")
        print("="*70)

    # Step 1: Scrape CNBC articles
    if verbose:
        print("\n[Step 1] Scraping CNBC articles...")

    articles = scrape_cnbc_with_articles(
        max_headlines=max_headlines,
        use_playwright=use_playwright,
        scroll_count=3 if use_playwright else 1
    )

    if not articles:
        print("No articles fetched. Exiting.")
        return {}

    if verbose:
        print(f"  Fetched {len(articles)} articles")

    # Step 2: Analyze signals
    if verbose:
        print("\n[Step 2] Analyzing trading signals...")

    signals_data = analyze_cnbc_signals(articles=articles, verbose=verbose)

    if verbose:
        print(f"  Analysis complete")
        print(f"  - Total articles: {signals_data['summary']['total_articles']}")
        print(f"  - Tickers with signals: {signals_data['summary']['tickers_with_signals']}")

    # Step 3: Save results
    if verbose:
        print("\n[Step 3] Saving results...")

    save_signals_to_json(signals_data, output_filename)

    # Also save summary
    summary_data = {
        'generated_at': datetime.now().isoformat(),
        'total_articles': signals_data['summary']['total_articles'],
        'signal_counts': signals_data['summary']['signal_counts'],
        'top_signals': sorted(
            signals_data['ticker_signals'],
            key=lambda x: abs(x.get('aggregate', {}).get('score', 0)),
            reverse=True
        )[:10]
    }

    summary_file = output_filename.replace('.json', '_summary.json')
    save_signals_to_json(summary_data, summary_file)

    if verbose:
        print("\n" + "="*70)
        print("PIPELINE COMPLETE")
        print("="*70)
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\nOutput files:")
        print(f"  - {output_filename} (full data)")
        print(f"  - {summary_file} (summary)")
        print("="*70)

    return signals_data


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='CNBC News Scraper with Signal Analysis'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=15,
        help='Number of articles to fetch (default: 15)'
    )
    parser.add_argument(
        '--playwright', '-p',
        action='store_true',
        help='Use Playwright for scraping'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='news_signals.json',
        help='Output filename (default: news_signals.json)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        default=True,
        help='Verbose output'
    )

    args = parser.parse_args()

    # Run the pipeline
    run_cnbc_pipeline(
        max_headlines=args.limit,
        use_playwright=args.playwright,
        output_filename=args.output,
        verbose=args.verbose
    )