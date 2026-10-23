"""
SignalEngine — News-to-Stock Signal Analyzer
Rule-based keyword matching for Global & US Markets

Usage:
    from engine.signal_engine import analyze
    result = analyze("Nvidia and Intel announce partnership...")
"""

# ============================================================
# 1. ENTITY DATABASE — keyword -> { ticker, name, sector }
# ============================================================

ENTITIES = {
    # --- Semiconductors ---
    'nvidia':               {'ticker': 'NVDA',      'name': 'Nvidia Corp',            'sector': 'semiconductors'},
    'nvda':                 {'ticker': 'NVDA',      'name': 'Nvidia Corp',            'sector': 'semiconductors'},
    'intel':                {'ticker': 'INTC',      'name': 'Intel Corp',             'sector': 'semiconductors'},
    'intc':                 {'ticker': 'INTC',      'name': 'Intel Corp',             'sector': 'semiconductors'},
    'amd':                  {'ticker': 'AMD',       'name': 'Advanced Micro Devices', 'sector': 'semiconductors'},
    'tsmc':                 {'ticker': 'TSM',       'name': 'Taiwan Semiconductor',   'sector': 'semiconductors'},
    'taiwan semiconductor': {'ticker': 'TSM',       'name': 'Taiwan Semiconductor',   'sector': 'semiconductors'},
    'qualcomm':             {'ticker': 'QCOM',      'name': 'Qualcomm Inc',           'sector': 'semiconductors'},
    'broadcom':             {'ticker': 'AVGO',      'name': 'Broadcom Inc',           'sector': 'semiconductors'},
    'asml':                 {'ticker': 'ASML',      'name': 'ASML Holding',           'sector': 'semiconductors'},
    'arm':                  {'ticker': 'ARM',       'name': 'ARM Holdings',           'sector': 'semiconductors'},
    'micron':               {'ticker': 'MU',        'name': 'Micron Technology',      'sector': 'semiconductors'},
    'applied materials':    {'ticker': 'AMAT',      'name': 'Applied Materials',      'sector': 'semiconductors'},
    'lam research':         {'ticker': 'LRCX',      'name': 'Lam Research',           'sector': 'semiconductors'},
    'marvell':              {'ticker': 'MRVL',      'name': 'Marvell Technology',     'sector': 'semiconductors'},
    'samsung':              {'ticker': '005930.KS', 'name': 'Samsung Electronics',    'sector': 'semiconductors'},
    'texas instruments':    {'ticker': 'TXN',  'name': 'Texas Instruments',     'sector': 'semiconductors'},
    'txn':                  {'ticker': 'TXN',  'name': 'Texas Instruments',     'sector': 'semiconductors'},
    'kla':                  {'ticker': 'KLAC', 'name': 'KLA Corp',              'sector': 'semiconductors'},
    'klac':                 {'ticker': 'KLAC', 'name': 'KLA Corp',              'sector': 'semiconductors'},
    'synopsys':             {'ticker': 'SNPS', 'name': 'Synopsys Inc',          'sector': 'semiconductors'},
    'snps':                 {'ticker': 'SNPS', 'name': 'Synopsys Inc',          'sector': 'semiconductors'},
    'cadence':              {'ticker': 'CDNS', 'name': 'Cadence Design',        'sector': 'semiconductors'},
    'cdns':                 {'ticker': 'CDNS', 'name': 'Cadence Design',        'sector': 'semiconductors'},

    # --- Big Tech ---
    'apple':                {'ticker': 'AAPL', 'name': 'Apple Inc',       'sector': 'big_tech'},
    'aapl':                 {'ticker': 'AAPL', 'name': 'Apple Inc',       'sector': 'big_tech'},
    'microsoft':            {'ticker': 'MSFT', 'name': 'Microsoft Corp',  'sector': 'big_tech'},
    'msft':                 {'ticker': 'MSFT', 'name': 'Microsoft Corp',  'sector': 'big_tech'},
    'google':               {'ticker': 'GOOGL', 'name': 'Alphabet Inc',   'sector': 'big_tech'},
    'alphabet':             {'ticker': 'GOOGL', 'name': 'Alphabet Inc',   'sector': 'big_tech'},
    'googl':                {'ticker': 'GOOGL', 'name': 'Alphabet Inc',   'sector': 'big_tech'},
    'meta':                 {'ticker': 'META', 'name': 'Meta Platforms',  'sector': 'big_tech'},
    'facebook':             {'ticker': 'META', 'name': 'Meta Platforms',  'sector': 'big_tech'},
    'amazon':               {'ticker': 'AMZN', 'name': 'Amazon.com Inc',  'sector': 'big_tech'},
    'aws':                  {'ticker': 'AMZN', 'name': 'Amazon / AWS',    'sector': 'big_tech'},
    'amzn':                 {'ticker': 'AMZN', 'name': 'Amazon.com Inc',  'sector': 'big_tech'},
    'netflix':              {'ticker': 'NFLX', 'name': 'Netflix Inc',     'sector': 'big_tech'},
    'nflx':                 {'ticker': 'NFLX', 'name': 'Netflix Inc',     'sector': 'big_tech'},
    'salesforce':           {'ticker': 'CRM',  'name': 'Salesforce Inc',  'sector': 'software'},
    'crm':                  {'ticker': 'CRM',  'name': 'Salesforce Inc',  'sector': 'software'},
    'adobe':                {'ticker': 'ADBE', 'name': 'Adobe Inc',       'sector': 'software'},
    'adbe':                 {'ticker': 'ADBE', 'name': 'Adobe Inc',       'sector': 'software'},
    'intuit':               {'ticker': 'INTU', 'name': 'Intuit Inc',      'sector': 'software'},
    'intu':                 {'ticker': 'INTU', 'name': 'Intuit Inc',      'sector': 'software'},
    'servicenow':           {'ticker': 'NOW',  'name': 'ServiceNow Inc',  'sector': 'software'},
    'now':                  {'ticker': 'NOW',  'name': 'ServiceNow Inc',  'sector': 'software'},
    'palo alto':            {'ticker': 'PANW', 'name': 'Palo Alto Networks', 'sector': 'cybersecurity'},
    'panw':                 {'ticker': 'PANW', 'name': 'Palo Alto Networks', 'sector': 'cybersecurity'},
    'crowdstrike':          {'ticker': 'CRWD', 'name': 'CrowdStrike Inc', 'sector': 'cybersecurity'},
    'crwd':                 {'ticker': 'CRWD', 'name': 'CrowdStrike Inc', 'sector': 'cybersecurity'},
    'cisco':                {'ticker': 'CSCO', 'name': 'Cisco Systems',   'sector': 'networking'},
    'csco':                 {'ticker': 'CSCO', 'name': 'Cisco Systems',   'sector': 'networking'},
    'palantir':             {'ticker': 'PLTR', 'name': 'Palantir Technologies', 'sector': 'software'},
    'pltr':                 {'ticker': 'PLTR', 'name': 'Palantir Technologies', 'sector': 'software'},

    # --- EV & Auto ---
    'tesla':                {'ticker': 'TSLA', 'name': 'Tesla Inc',          'sector': 'ev'},
    'tsla':                 {'ticker': 'TSLA', 'name': 'Tesla Inc',          'sector': 'ev'},
    'ford':                 {'ticker': 'F',    'name': 'Ford Motor Co',      'sector': 'auto'},
    'gm':                   {'ticker': 'GM',   'name': 'General Motors',     'sector': 'auto'},
    'general motors':       {'ticker': 'GM',   'name': 'General Motors',     'sector': 'auto'},
    'rivian':               {'ticker': 'RIVN', 'name': 'Rivian Automotive',  'sector': 'ev'},
    'lucid':                {'ticker': 'LCID', 'name': 'Lucid Group',        'sector': 'ev'},
    'albemarle':            {'ticker': 'ALB',  'name': 'Albemarle Corp',     'sector': 'materials'},
    'sqm':                  {'ticker': 'SQM',  'name': 'Sociedad Quimica',   'sector': 'materials'},
    'uber':                 {'ticker': 'UBER', 'name': 'Uber Technologies',  'sector': 'tech'},
    'deere':                {'ticker': 'DE',   'name': 'Deere & Co',         'sector': 'industrials'},

    # --- Energy ---
    'exxon':                {'ticker': 'XOM', 'name': 'Exxon Mobil',      'sector': 'energy'},
    'exxonmobil':           {'ticker': 'XOM', 'name': 'Exxon Mobil',      'sector': 'energy'},
    'xom':                  {'ticker': 'XOM', 'name': 'Exxon Mobil',      'sector': 'energy'},
    'chevron':              {'ticker': 'CVX', 'name': 'Chevron Corp',     'sector': 'energy'},
    'cvx':                  {'ticker': 'CVX', 'name': 'Chevron Corp',     'sector': 'energy'},
    'conocophillips':       {'ticker': 'COP', 'name': 'ConocoPhillips',   'sector': 'energy'},
    'halliburton':          {'ticker': 'HAL', 'name': 'Halliburton Co',   'sector': 'energy'},
    'schlumberger':         {'ticker': 'SLB', 'name': 'SLB',              'sector': 'energy'},
    'bp':                   {'ticker': 'BP',  'name': 'BP plc',           'sector': 'energy'},
    'shell':                {'ticker': 'SHEL', 'name': 'Shell plc',        'sector': 'energy'},
    'eog resources':        {'ticker': 'EOG',  'name': 'EOG Resources',    'sector': 'energy'},
    'eog':                  {'ticker': 'EOG',  'name': 'EOG Resources',    'sector': 'energy'},
    'opec':                 {'ticker': None,  'name': 'OPEC',             'sector': 'energy_macro'},

    # --- Banking & Finance ---
    'jpmorgan':             {'ticker': 'JPM',  'name': 'JPMorgan Chase',  'sector': 'banking'},
    'jp morgan':            {'ticker': 'JPM',  'name': 'JPMorgan Chase',  'sector': 'banking'},
    'jpm':                  {'ticker': 'JPM',  'name': 'JPMorgan Chase',  'sector': 'banking'},
    'bank of america':      {'ticker': 'BAC',  'name': 'Bank of America', 'sector': 'banking'},
    'bac':                  {'ticker': 'BAC',  'name': 'Bank of America', 'sector': 'banking'},
    'goldman sachs':        {'ticker': 'GS',   'name': 'Goldman Sachs',   'sector': 'banking'},
    'gs':                   {'ticker': 'GS',   'name': 'Goldman Sachs',   'sector': 'banking'},
    'morgan stanley':       {'ticker': 'MS',   'name': 'Morgan Stanley',  'sector': 'banking'},
    'wells fargo':          {'ticker': 'WFC',  'name': 'Wells Fargo',     'sector': 'banking'},
    'citigroup':            {'ticker': 'C',    'name': 'Citigroup',       'sector': 'banking'},
    'citi':                 {'ticker': 'C',    'name': 'Citigroup',       'sector': 'banking'},
    'visa':                 {'ticker': 'V',    'name': 'Visa Inc',        'sector': 'fintech'},
    'mastercard':           {'ticker': 'MA',   'name': 'Mastercard Inc',  'sector': 'fintech'},
    'paypal':               {'ticker': 'PYPL', 'name': 'PayPal Holdings', 'sector': 'fintech'},
    'american express':     {'ticker': 'AXP',  'name': 'American Express', 'sector': 'fintech'},
    'axp':                  {'ticker': 'AXP',  'name': 'American Express', 'sector': 'fintech'},
    'blackrock':            {'ticker': 'BLK',  'name': 'BlackRock Inc',   'sector': 'asset_management'},
    'blk':                  {'ticker': 'BLK',  'name': 'BlackRock Inc',   'sector': 'asset_management'},
    'blackstone':           {'ticker': 'BX',   'name': 'Blackstone Inc',  'sector': 'asset_management'},
    'bx':                   {'ticker': 'BX',   'name': 'Blackstone Inc',  'sector': 'asset_management'},
    'cme group':            {'ticker': 'CME',  'name': 'CME Group Inc',   'sector': 'exchanges'},
    'cme':                  {'ticker': 'CME',  'name': 'CME Group Inc',   'sector': 'exchanges'},
    "moody's":              {'ticker': 'MCO',  'name': "Moody's Corp",    'sector': 'financials'},
    'mco':                  {'ticker': 'MCO',  'name': "Moody's Corp",    'sector': 'financials'},
    's&p global':           {'ticker': 'SPGI', 'name': 'S&P Global Inc',  'sector': 'financials'},
    'spgi':                 {'ticker': 'SPGI', 'name': 'S&P Global Inc',  'sector': 'financials'},
    'chubb':                {'ticker': 'CB',   'name': 'Chubb Ltd',       'sector': 'insurance'},
    'cb':                   {'ticker': 'CB',   'name': 'Chubb Ltd',       'sector': 'insurance'},

    # --- Defense ---
    'lockheed':             {'ticker': 'LMT', 'name': 'Lockheed Martin',  'sector': 'defense'},
    'lockheed martin':      {'ticker': 'LMT', 'name': 'Lockheed Martin',  'sector': 'defense'},
    'lmt':                  {'ticker': 'LMT', 'name': 'Lockheed Martin',  'sector': 'defense'},
    'raytheon':             {'ticker': 'RTX', 'name': 'RTX Corp',         'sector': 'defense'},
    'rtx':                  {'ticker': 'RTX', 'name': 'RTX Corp',         'sector': 'defense'},
    'northrop grumman':     {'ticker': 'NOC', 'name': 'Northrop Grumman', 'sector': 'defense'},
    'boeing':               {'ticker': 'BA',  'name': 'Boeing Co',        'sector': 'defense'},
    'general dynamics':     {'ticker': 'GD',  'name': 'General Dynamics', 'sector': 'defense'},
    'axon':                 {'ticker': 'AXON', 'name': 'Axon Enterprise', 'sector': 'defense'},

    # --- Airlines ---
    'delta':                {'ticker': 'DAL',   'name': 'Delta Air Lines',    'sector': 'airlines'},
    'united airlines':      {'ticker': 'UAL',   'name': 'United Airlines',    'sector': 'airlines'},
    'american airlines':    {'ticker': 'AAL',   'name': 'American Airlines',  'sector': 'airlines'},
    'southwest':            {'ticker': 'LUV',   'name': 'Southwest Airlines', 'sector': 'airlines'},
    'ryanair':              {'ticker': 'RYAAY', 'name': 'Ryanair Holdings',   'sector': 'airlines'},

    # --- Pharma / Healthcare ---
    'pfizer':               {'ticker': 'PFE',  'name': 'Pfizer Inc',          'sector': 'pharma'},
    'moderna':              {'ticker': 'MRNA', 'name': 'Moderna Inc',         'sector': 'pharma'},
    'johnson & johnson':    {'ticker': 'JNJ',  'name': 'Johnson & Johnson',   'sector': 'pharma'},
    'j&j':                  {'ticker': 'JNJ',  'name': 'Johnson & Johnson',   'sector': 'pharma'},
    'abbvie':               {'ticker': 'ABBV', 'name': 'AbbVie Inc',          'sector': 'pharma'},
    'eli lilly':            {'ticker': 'LLY',  'name': 'Eli Lilly',           'sector': 'pharma'},
    'novo nordisk':         {'ticker': 'NVO',  'name': 'Novo Nordisk',        'sector': 'pharma'},
    'unitedhealth':         {'ticker': 'UNH',  'name': 'UnitedHealth Group',  'sector': 'healthcare'},
    'bristol-myers':        {'ticker': 'BMY',  'name': 'Bristol-Myers Squibb', 'sector': 'pharma'},
    'bmy':                  {'ticker': 'BMY',  'name': 'Bristol-Myers Squibb', 'sector': 'pharma'},
    'amgen':                {'ticker': 'AMGN', 'name': 'Amgen Inc',           'sector': 'pharma'},
    'amgn':                 {'ticker': 'AMGN', 'name': 'Amgen Inc',           'sector': 'pharma'},
    'gilead':               {'ticker': 'GILD', 'name': 'Gilead Sciences',    'sector': 'pharma'},
    'gild':                 {'ticker': 'GILD', 'name': 'Gilead Sciences',    'sector': 'pharma'},
    'merck':                {'ticker': 'MRK',  'name': 'Merck & Co',         'sector': 'pharma'},
    'mrk':                  {'ticker': 'MRK',  'name': 'Merck & Co',         'sector': 'pharma'},
    'regeneron':            {'ticker': 'REGN', 'name': 'Regeneron Pharmaceuticals', 'sector': 'pharma'},
    'regn':                 {'ticker': 'REGN', 'name': 'Regeneron Pharmaceuticals', 'sector': 'pharma'},
    'vertex':               {'ticker': 'VRTX', 'name': 'Vertex Pharmaceuticals', 'sector': 'pharma'},
    'vrtx':                 {'ticker': 'VRTX', 'name': 'Vertex Pharmaceuticals', 'sector': 'pharma'},
    'intuitive surgical':   {'ticker': 'ISRG', 'name': 'Intuitive Surgical', 'sector': 'medtech'},
    'isrg':                 {'ticker': 'ISRG', 'name': 'Intuitive Surgical', 'sector': 'medtech'},
    'stryker':              {'ticker': 'SYK',  'name': 'Stryker Corp',       'sector': 'medtech'},
    'syk':                  {'ticker': 'SYK',  'name': 'Stryker Corp',       'sector': 'medtech'},
    'thermo fisher':        {'ticker': 'TMO',  'name': 'Thermo Fisher Scientific', 'sector': 'life_sciences'},
    'tmo':                  {'ticker': 'TMO',  'name': 'Thermo Fisher Scientific', 'sector': 'life_sciences'},
    'danaher':              {'ticker': 'DHR',  'name': 'Danaher Corp',       'sector': 'life_sciences'},
    'dhr':                  {'ticker': 'DHR',  'name': 'Danaher Corp',       'sector': 'life_sciences'},
    'cigna':                {'ticker': 'CI',   'name': 'Cigna Group',        'sector': 'healthcare'},
    'ci':                   {'ticker': 'CI',   'name': 'Cigna Group',        'sector': 'healthcare'},
    'hca healthcare':       {'ticker': 'HCA',  'name': 'HCA Healthcare',     'sector': 'healthcare'},
    'hca':                  {'ticker': 'HCA',  'name': 'HCA Healthcare',     'sector': 'healthcare'},

    # --- Retail / Consumer ---
    'walmart':              {'ticker': 'WMT',  'name': 'Walmart Inc',        'sector': 'retail'},
    'target':               {'ticker': 'TGT',  'name': 'Target Corp',        'sector': 'retail'},
    'costco':               {'ticker': 'COST', 'name': 'Costco Wholesale',   'sector': 'retail'},
    'nike':                 {'ticker': 'NKE',  'name': 'Nike Inc',           'sector': 'consumer'},
    'starbucks':            {'ticker': 'SBUX', 'name': 'Starbucks Corp',     'sector': 'consumer'},
    'mcdonalds':            {'ticker': 'MCD',  'name': "McDonald's Corp",    'sector': 'consumer'},
    'coca-cola':            {'ticker': 'KO',   'name': 'Coca-Cola Co',       'sector': 'consumer'},
    'ko':                   {'ticker': 'KO',   'name': 'Coca-Cola Co',       'sector': 'consumer'},
    'pepsi':                {'ticker': 'PEP',  'name': 'PepsiCo Inc',        'sector': 'consumer'},
    'pep':                  {'ticker': 'PEP',  'name': 'PepsiCo Inc',        'sector': 'consumer'},
    'procter':              {'ticker': 'PG',   'name': 'Procter & Gamble',   'sector': 'consumer'},
    'pg':                   {'ticker': 'PG',   'name': 'Procter & Gamble',   'sector': 'consumer'},
    'mondelez':             {'ticker': 'MDLZ', 'name': 'Mondelez International', 'sector': 'consumer'},
    'mdlz':                 {'ticker': 'MDLZ', 'name': 'Mondelez International', 'sector': 'consumer'},
    'home depot':           {'ticker': 'HD',   'name': 'Home Depot Inc',     'sector': 'retail'},
    'hd':                   {'ticker': 'HD',   'name': 'Home Depot Inc',     'sector': 'retail'},
    "lowe's":               {'ticker': 'LOW',  'name': "Lowe's Companies",   'sector': 'retail'},
    'low':                  {'ticker': 'LOW',  'name': "Lowe's Companies",   'sector': 'retail'},
    'tjx':                  {'ticker': 'TJX',  'name': 'TJX Companies',      'sector': 'retail'},
    'booking':              {'ticker': 'BKNG', 'name': 'Booking Holdings',   'sector': 'travel'},
    'bkng':                 {'ticker': 'BKNG', 'name': 'Booking Holdings',   'sector': 'travel'},

    # --- Industrials ---
    'general electric':     {'ticker': 'GE',   'name': 'General Electric',   'sector': 'industrials'},
    'ge':                   {'ticker': 'GE',   'name': 'General Electric',   'sector': 'industrials'},
    'caterpillar':          {'ticker': 'CAT',  'name': 'Caterpillar Inc',    'sector': 'industrials'},
    'eaton':                {'ticker': 'ETN',  'name': 'Eaton Corp',         'sector': 'industrials'},
    'etn':                  {'ticker': 'ETN',  'name': 'Eaton Corp',         'sector': 'industrials'},
    'emerson':              {'ticker': 'EMR',  'name': 'Emerson Electric',   'sector': 'industrials'},
    'emr':                  {'ticker': 'EMR',  'name': 'Emerson Electric',   'sector': 'industrials'},
    'illinois tool':        {'ticker': 'ITW',  'name': 'Illinois Tool Works', 'sector': 'industrials'},
    'itw':                  {'ticker': 'ITW',  'name': 'Illinois Tool Works', 'sector': 'industrials'},
    'parker hannifin':      {'ticker': 'PH',   'name': 'Parker-Hannifin',    'sector': 'industrials'},
    'ph':                   {'ticker': 'PH',   'name': 'Parker-Hannifin',    'sector': 'industrials'},
    'adp':                  {'ticker': 'ADP',  'name': 'ADP Inc',            'sector': 'business_services'},
    'accenture':            {'ticker': 'ACN',  'name': 'Accenture plc',      'sector': 'consulting'},
    'acn':                  {'ticker': 'ACN',  'name': 'Accenture plc',      'sector': 'consulting'},
    'fedex':                {'ticker': 'FDX',  'name': 'FedEx Corp',         'sector': 'logistics'},
    'fdx':                  {'ticker': 'FDX',  'name': 'FedEx Corp',         'sector': 'logistics'},
    'ups':                  {'ticker': 'UPS',  'name': 'United Parcel Service', 'sector': 'logistics'},
    'norfolk southern':     {'ticker': 'NSC',  'name': 'Norfolk Southern',   'sector': 'logistics'},
    'nsc':                  {'ticker': 'NSC',  'name': 'Norfolk Southern',   'sector': 'logistics'},
    'waste management':     {'ticker': 'WM',   'name': 'Waste Management',   'sector': 'industrials'},
    'wm':                   {'ticker': 'WM',   'name': 'Waste Management',   'sector': 'industrials'},

    # --- Materials ---
    'linde':                {'ticker': 'LIN',  'name': 'Linde plc',          'sector': 'materials'},
    'lin':                  {'ticker': 'LIN',  'name': 'Linde plc',          'sector': 'materials'},
    'air products':         {'ticker': 'APD',  'name': 'Air Products',       'sector': 'materials'},
    'apd':                  {'ticker': 'APD',  'name': 'Air Products',       'sector': 'materials'},
    'ecolab':               {'ticker': 'ECL',  'name': 'Ecolab Inc',         'sector': 'materials'},
    'ecl':                  {'ticker': 'ECL',  'name': 'Ecolab Inc',         'sector': 'materials'},

    # --- REITs ---
    'american tower':       {'ticker': 'AMT',  'name': 'American Tower',     'sector': 'reit'},
    'welltower':            {'ticker': 'WELL', 'name': 'Welltower Inc',      'sector': 'reit'},
    'well':                 {'ticker': 'WELL', 'name': 'Welltower Inc',      'sector': 'reit'},
    'public storage':       {'ticker': 'PSA',  'name': 'Public Storage',     'sector': 'reit'},
    'psa':                  {'ticker': 'PSA',  'name': 'Public Storage',     'sector': 'reit'},
    'prologis':             {'ticker': 'PLD',  'name': 'Prologis Inc',       'sector': 'reit'},
    'pld':                  {'ticker': 'PLD',  'name': 'Prologis Inc',       'sector': 'reit'},

    # --- Utilities ---
    'southern company':     {'ticker': 'SO',   'name': 'Southern Company',   'sector': 'utilities'},
    'so':                   {'ticker': 'SO',   'name': 'Southern Company',   'sector': 'utilities'},
    'duke energy':          {'ticker': 'DUK',  'name': 'Duke Energy',        'sector': 'utilities'},
    'duk':                  {'ticker': 'DUK',  'name': 'Duke Energy',        'sector': 'utilities'},
    'nextera':              {'ticker': 'NEE',  'name': 'NextEra Energy',     'sector': 'utilities'},
    'nee':                  {'ticker': 'NEE',  'name': 'NextEra Energy',     'sector': 'utilities'},

    # --- Commodities ---
    'gold':                 {'ticker': 'GLD',  'name': 'Gold (ETF: GLD)',    'sector': 'commodities'},
    'silver':               {'ticker': 'SLV',  'name': 'Silver (ETF: SLV)',  'sector': 'commodities'},
    'copper':               {'ticker': 'COPX', 'name': 'Copper (ETF: COPX)', 'sector': 'commodities'},
    'freeport':             {'ticker': 'FCX',  'name': 'Freeport-McMoRan',   'sector': 'mining'},
    'barrick':              {'ticker': 'GOLD', 'name': 'Barrick Gold',       'sector': 'mining'},

    # --- Crypto ---
    'coinbase':             {'ticker': 'COIN', 'name': 'Coinbase Global',    'sector': 'crypto'},
    'bitcoin':              {'ticker': 'MSTR', 'name': 'Bitcoin proxy (MSTR)', 'sector': 'crypto'},
    'microstrategy':        {'ticker': 'MSTR', 'name': 'MicroStrategy',      'sector': 'crypto'},

    # --- Macro Actors (no ticker, sector rules only) ---
    'federal reserve':      {'ticker': None, 'name': 'Federal Reserve',     'sector': 'macro'},
    'fed':                  {'ticker': None, 'name': 'Federal Reserve',     'sector': 'macro'},
    'jerome powell':        {'ticker': None, 'name': 'Fed Chair Powell',    'sector': 'macro'},
    'ecb':                  {'ticker': None, 'name': 'European Central Bank', 'sector': 'macro'},
    'china':                {'ticker': None, 'name': 'China',               'sector': 'geopolitical'},
    'russia':               {'ticker': None, 'name': 'Russia',              'sector': 'geopolitical'},
}

# ============================================================
# 2. SENTIMENT DICTIONARY
# ============================================================

SENTIMENT_POS = [
    {'words': ['partnership', 'partners with', 'strategic alliance', 'collaboration', 'joint venture'], 'score': 2.5, 'label': 'Strategic Partnership'},
    {'words': ['acquisition', 'acquires', 'takeover', 'buyout', 'merger'],                              'score': 3.0, 'label': 'M&A Activity'},
    {'words': ['record profit', 'record revenue', 'all-time high', 'blowout earnings', 'beat expectations', 'beats estimates', 'beat estimates'], 'score': 3.0, 'label': 'Earnings Beat'},
    {'words': ['contract', 'major deal', 'billion dollar deal', 'secures deal', 'wins contract'],        'score': 2.5, 'label': 'Major Contract'},
    {'words': ['breakthrough', 'revolutionary', 'new technology', 'patent', 'innovation'],               'score': 2.0, 'label': 'Innovation'},
    {'words': ['upgrade', 'price target raised', 'buy rating', 'strong buy', 'outperform'],              'score': 2.0, 'label': 'Analyst Upgrade'},
    {'words': ['investment', 'expands', 'expansion', 'opens new', 'new plant', 'new factory'],           'score': 1.5, 'label': 'Expansion'},
    {'words': ['profit', 'revenue growth', 'sales growth', 'strong earnings', 'beat earnings'],          'score': 2.0, 'label': 'Profit Growth'},
    {'words': ['approved', 'fda approval', 'regulatory approval', 'cleared', 'green light'],             'score': 2.5, 'label': 'Regulatory Approval'},
    {'words': ['dividend', 'buyback', 'share repurchase', 'special dividend'],                           'score': 1.5, 'label': 'Shareholder Return'},
    {'words': ['supply deal', 'supply agreement', 'manufacturing deal'],                                 'score': 2.0, 'label': 'Supply Agreement'},
    {'words': ['raised guidance', 'raises guidance', 'positive outlook', 'strong demand'],               'score': 1.5, 'label': 'Positive Guidance'},
    {'words': ['recovery', 'rebound', 'turnaround'],                                                     'score': 1.5, 'label': 'Recovery'},
    {'words': ['launch', 'launches', 'unveiled', 'new product'],                                         'score': 1.5, 'label': 'Product Launch'},
    {'words': ['ipo', 'going public', 'listing'],                                                        'score': 2.0, 'label': 'IPO / Listing'},
]

SENTIMENT_NEG = [
    {'words': ['bankruptcy', 'bankrupt', 'chapter 11', 'insolvency', 'default'],                                      'score': -3.0, 'label': 'Bankruptcy Risk'},
    {'words': ['fraud', 'accounting fraud', 'scandal', 'class action', 'sec investigation', 'doj investigation'],      'score': -3.0, 'label': 'Legal / Fraud Risk'},
    {'words': ['massive layoffs', 'mass layoffs', 'thousands laid off', 'job cuts', 'workforce reduction'],            'score': -2.5, 'label': 'Mass Layoffs'},
    {'words': ['sanction', 'sanctioned', 'banned', 'blacklisted', 'export ban', 'trade ban'],                          'score': -2.5, 'label': 'Sanctions / Ban'},
    {'words': ['misses earnings', 'miss earnings', 'missed expectations', 'below expectations', 'earnings miss'],      'score': -2.5, 'label': 'Earnings Miss'},
    {'words': ['recall', 'product recall', 'safety recall', 'defective'],                                              'score': -2.0, 'label': 'Product Recall'},
    {'words': ['data breach', 'cyberattack', 'hacked', 'ransomware'],                                                  'score': -2.0, 'label': 'Cybersecurity Breach'},
    {'words': ['downgrade', 'price target cut', 'sell rating', 'underperform', 'underweight'],                         'score': -2.0, 'label': 'Analyst Downgrade'},
    {'words': ['loses contract', 'contract cancelled', 'deal falls through', 'deal terminated'],                       'score': -2.0, 'label': 'Lost Contract'},
    {'words': ['tariff', 'tariffs', 'trade war', 'trade dispute', 'import tax'],                                       'score': -2.0, 'label': 'Trade Tariffs'},
    {'words': ['lowered guidance', 'lowers guidance', 'cuts guidance', 'negative outlook', 'weak demand'],             'score': -1.5, 'label': 'Negative Guidance'},
    {'words': ['antitrust', 'monopoly investigation', 'regulatory probe', 'fined', 'penalty'],                         'score': -2.0, 'label': 'Regulatory Risk'},
    {'words': ['net loss', 'operating loss', 'quarterly loss'],                                                        'score': -2.0, 'label': 'Financial Loss'},
    {'words': ['ceo resigns', 'ceo fired', 'cfo resigns', 'leadership crisis'],                                        'score': -1.5, 'label': 'Leadership Crisis'},
    {'words': ['supply shortage', 'supply disruption', 'production halt'],                                             'score': -1.5, 'label': 'Supply Disruption'},
]

# ============================================================
# 3. SECTOR RULES
# ============================================================

SECTOR_RULES = [
    {
        'triggers': ['interest rate hike', 'rate hike', 'fed raises', 'higher rates', 'rate increase', 'monetary tightening', 'hawkish'],
        'effects': [
            {'sector': 'Banking',             'tickers': ['JPM', 'BAC', 'GS', 'MS', 'WFC'], 'dir': 1,  'reason': 'Higher rates boost net interest margin'},
            {'sector': 'Real Estate / REITs', 'tickers': ['AMT', 'PLD', 'O'],               'dir': -1, 'reason': 'Higher borrowing costs hurt property values'},
            {'sector': 'Growth Tech',         'tickers': ['TSLA', 'RIVN', 'LCID'],           'dir': -1, 'reason': 'High rates compress long-duration valuations'},
            {'sector': 'Utilities',           'tickers': ['NEE', 'DUK'],                    'dir': -1, 'reason': 'Rate-sensitive sector faces higher cost of capital'},
        ]
    },
    {
        'triggers': ['interest rate cut', 'rate cut', 'fed cuts', 'lower rates', 'dovish', 'monetary easing'],
        'effects': [
            {'sector': 'Real Estate / REITs', 'tickers': ['AMT', 'PLD', 'O'],               'dir': 1,  'reason': 'Lower rates reduce borrowing costs'},
            {'sector': 'Growth Tech',         'tickers': ['TSLA', 'NVDA', 'META'],           'dir': 1,  'reason': 'Lower rates improve DCF valuations'},
            {'sector': 'Banking',             'tickers': ['JPM', 'BAC', 'WFC'],              'dir': -1, 'reason': 'Lower rates compress net interest margin'},
        ]
    },
    {
        'triggers': ['oil price rises', 'oil surges', 'oil rallies', 'crude rises', 'brent crude higher', 'wti higher', 'opec cuts'],
        'effects': [
            {'sector': 'Energy',              'tickers': ['XOM', 'CVX', 'COP', 'HAL'], 'dir': 1,  'reason': 'Higher oil prices boost producer revenue'},
            {'sector': 'Airlines',            'tickers': ['DAL', 'UAL', 'AAL', 'LUV'],  'dir': -1, 'reason': 'Jet fuel costs rise, squeezing margins'},
            {'sector': 'Consumer',            'tickers': ['WMT', 'TGT', 'AMZN'],        'dir': -1, 'reason': 'Higher energy costs reduce spending power'},
        ]
    },
    {
        'triggers': ['oil falls', 'oil drops', 'oil decline', 'crude falls', 'falling oil', 'oil crash', 'opec increases production'],
        'effects': [
            {'sector': 'Energy',              'tickers': ['XOM', 'CVX', 'COP'],           'dir': -1, 'reason': 'Lower oil prices reduce producer revenue'},
            {'sector': 'Airlines',            'tickers': ['DAL', 'UAL', 'AAL', 'LUV'],     'dir': 1,  'reason': 'Lower jet fuel costs improve margins'},
            {'sector': 'Consumer',            'tickers': ['WMT', 'COST', 'MCD'],           'dir': 1,  'reason': 'Lower energy costs boost consumer spending'},
        ]
    },
    {
        'triggers': ['inflation rises', 'cpi higher', 'cpi rises', 'price surge', 'hyperinflation', 'inflation jumps'],
        'effects': [
            {'sector': 'Commodities',                'tickers': ['GLD', 'SLV', 'FCX'],      'dir': 1,  'reason': 'Hard assets serve as inflation hedge'},
            {'sector': 'Energy',                     'tickers': ['XOM', 'CVX'],             'dir': 1,  'reason': 'Energy prices typically rise with inflation'},
            {'sector': 'Consumer Discretionary',     'tickers': ['TGT', 'NKE', 'SBUX'],     'dir': -1, 'reason': 'Consumers cut spending on non-essentials'},
            {'sector': 'Fixed Income',               'tickers': ['TLT', 'BND'],             'dir': -1, 'reason': 'Inflation erodes fixed income returns'},
        ]
    },
    {
        'triggers': ['war', 'military conflict', 'armed conflict', 'missile strike', 'invasion', 'geopolitical tension', 'military escalation'],
        'effects': [
            {'sector': 'Defense',              'tickers': ['LMT', 'RTX', 'NOC', 'GD'],     'dir': 1,  'reason': 'Conflict drives defense spending'},
            {'sector': 'Energy',               'tickers': ['XOM', 'CVX', 'COP'],           'dir': 1,  'reason': 'Supply disruption pushes energy prices up'},
            {'sector': 'Airlines / Travel',    'tickers': ['DAL', 'UAL'],                  'dir': -1, 'reason': 'Conflict reduces travel demand'},
            {'sector': 'Global Supply Chain',  'tickers': ['AMZN', 'AAPL', 'TSM'],         'dir': -1, 'reason': 'Conflict disrupts global logistics'},
        ]
    },
    {
        'triggers': ['trade war', 'us-china', 'china tariff', 'export restriction', 'chip ban', 'export control', 'decoupling'],
        'effects': [
            {'sector': 'Semiconductors (US)', 'tickers': ['NVDA', 'AMD', 'QCOM'],          'dir': -1, 'reason': 'Export controls limit chip sales to China'},
            {'sector': 'Defense Tech',        'tickers': ['LMT', 'RTX', 'NOC'],            'dir': 1,  'reason': 'Geopolitical tension boosts defense budgets'},
            {'sector': 'US Manufacturing',    'tickers': ['AMAT', 'LRCX', 'INTC'],         'dir': 1,  'reason': 'Onshoring trend benefits domestic manufacturers'},
        ]
    },
    {
        'triggers': ['artificial intelligence', 'generative ai', 'ai boom', 'ai investment', 'ai infrastructure', 'llm', 'large language model'],
        'effects': [
            {'sector': 'AI Chips',             'tickers': ['NVDA', 'AMD', 'INTC'],              'dir': 1, 'reason': 'AI boom drives massive GPU/accelerator demand'},
            {'sector': 'Cloud / Hyperscalers', 'tickers': ['AMZN', 'MSFT', 'GOOGL'],             'dir': 1, 'reason': 'AI workloads increase cloud infrastructure spend'},
            {'sector': 'Power / Energy',       'tickers': ['NEE', 'VST', 'GEV'],                'dir': 1, 'reason': 'Data centers require massive power capacity'},
            {'sector': 'Memory',               'tickers': ['MU'],                               'dir': 1, 'reason': 'AI models require high-bandwidth memory'},
        ]
    },
    {
        'triggers': ['recession', 'economic downturn', 'gdp contraction', 'gdp shrinks', 'economic slowdown', 'economic crisis'],
        'effects': [
            {'sector': 'Defensives',                'tickers': ['WMT', 'JNJ'],               'dir': 1,  'reason': 'Defensive stocks outperform in downturns'},
            {'sector': 'Consumer Discretionary',    'tickers': ['NKE', 'SBUX', 'TGT'],       'dir': -1, 'reason': 'Consumers cut non-essential spending'},
            {'sector': 'Cyclicals',                 'tickers': ['F', 'GM', 'CAT'],           'dir': -1, 'reason': 'Cyclicals hit hard by reduced industrial activity'},
            {'sector': 'Crypto',                    'tickers': ['COIN', 'MSTR'],             'dir': -1, 'reason': 'Risk-off sentiment hits speculative assets'},
        ]
    },
    {
        'triggers': ['electric vehicle', 'ev adoption', 'ev boom', 'ev sales', 'battery technology', 'charging infrastructure'],
        'effects': [
            {'sector': 'EV Makers',          'tickers': ['TSLA', 'RIVN', 'LCID', 'GM'],  'dir': 1,  'reason': 'EV adoption trend benefits electric vehicle makers'},
            {'sector': 'Lithium / Battery',  'tickers': ['ALB', 'SQM'],                  'dir': 1,  'reason': 'EV growth drives lithium and battery demand'},
            {'sector': 'Traditional Auto',   'tickers': ['F', 'GM'],                     'dir': -1, 'reason': 'EV transition disrupts traditional auto model'},
        ]
    },
    {
        'triggers': ['bitcoin rally', 'crypto rally', 'crypto surge', 'btc rally', 'eth rally', 'digital asset boom'],
        'effects': [
            {'sector': 'Crypto Exchanges',  'tickers': ['COIN'],     'dir': 1, 'reason': 'Rally boosts trading volume and exchange revenue'},
            {'sector': 'Crypto Holdings',   'tickers': ['MSTR'],     'dir': 1, 'reason': 'Companies holding BTC benefit from price rise'},
        ]
    },
    {
        'triggers': ['fda approval', 'drug approval', 'clinical trial success', 'vaccine approved', 'drug breakthrough'],
        'effects': [
            {'sector': 'Pharma / Biotech',   'tickers': ['PFE', 'MRNA', 'LLY', 'ABBV'], 'dir': 1, 'reason': 'Approvals and breakthroughs drive pharma valuations'},
            {'sector': 'Healthcare Systems', 'tickers': ['UNH'],                        'dir': 1, 'reason': 'New treatments expand healthcare market'},
        ]
    },
]

# ============================================================
# 4. RELATION MAP
# ============================================================

RELATIONS = {
    'NVDA': {
        'suppliers': [
            {'ticker': 'TSM',  'name': 'TSMC',             'reason': 'Primary chip manufacturer for Nvidia'},
            {'ticker': 'ASML', 'name': 'ASML',             'reason': 'Supplies EUV lithography for chip production'},
        ],
    },
    'INTC': {
        'suppliers': [
            {'ticker': 'ASML', 'name': 'ASML',              'reason': 'Supplies lithography equipment to Intel fabs'},
            {'ticker': 'AMAT', 'name': 'Applied Materials', 'reason': 'Key equipment supplier'},
        ],
    },
    'AAPL': {
        'suppliers': [
            {'ticker': 'TSM',  'name': 'TSMC',              'reason': "Manufactures Apple's A-series and M-series chips"},
            {'ticker': 'QCOM', 'name': 'Qualcomm',          'reason': 'Supplies modems for iPhones'},
            {'ticker': 'AVGO', 'name': 'Broadcom',          'reason': 'Supplies wireless chips to Apple'},
        ],
    },
    'TSLA': {
        'suppliers': [
            {'ticker': 'ALB', 'name': 'Albemarle',          'reason': 'Key lithium supplier for Tesla batteries'},
        ],
    },
    'AMZN': {
        'suppliers': [],
    },
    'GOOGL': {
        'suppliers': [
            {'ticker': 'TSM', 'name': 'TSMC',               'reason': "Manufactures Google's custom TPU chips"},
        ],
    },
    'MSFT': {
        'suppliers': [
            {'ticker': 'NVDA', 'name': 'Nvidia',            'reason': 'Supplies GPU infrastructure for Azure AI'},
        ],
    },
}

import re

# ============================================================
# 5. SCORING CONSTANTS
# ============================================================

SCORE = {
    'ENTITY_DIRECT':     2.0,
    'SECTOR_IMPACT':     1.5,
    'RELATION_SUPPLIER': 0.8,
    'BULLISH_THRESHOLD':  1.0,
    'BEARISH_THRESHOLD': -1.0,
}

# ============================================================
# 6. CORE ANALYZE FUNCTION
# ============================================================


def _is_negated(text_lower, start_idx):
    if start_idx <= 0:
        return False
    start = max(0, start_idx - 35)
    preceding = text_lower[start:start_idx]
    negation_pattern = r'\b(no|not|never|fail|fails|failed|cancel|cancels|cancelled|terminate|terminated|lost|prevent|prevents|delay|delays|delayed|falls?\s+through)\b'
    return bool(re.search(negation_pattern, preceding))


def analyze(text):
    """
    Analyze news text and return signal analysis result.

    Args:
        text: Raw news headline or article body.

    Returns:
        dict with keys: signal, score, confidence, stocks, sectors, triggers, meta
    """
    lower = text.lower()

    # --- Step 1: Entity Detection ---
    entities = {}

    for keyword, entity in ENTITIES.items():
        # Match using case-insensitive word boundaries to avoid false positives (e.g. C, AMD, GM, BP, Ford)
        if not re.search(rf"\b{re.escape(keyword)}\b", lower):
            continue

        key = entity['ticker'] or entity['name']
        if key in entities:
            continue

        entities[key] = {
            'ticker': entity['ticker'],
            'name': entity['name'],
            'sector': entity['sector'],
            'score': SCORE['ENTITY_DIRECT'] if entity['ticker'] else 0,
            'reasons': ['Directly mentioned in news'] if entity['ticker'] else [],
            'source': 'direct',
        }

    # --- Step 2: Sentiment Scoring ---
    triggers_pos = []
    triggers_neg = []

    for item in SENTIMENT_POS:
        for w in item['words']:
            match = re.search(rf"\b{re.escape(w)}\b", lower)
            if match:
                start_idx = match.start()
                if _is_negated(lower, start_idx):
                    triggers_neg.append({'label': f"Negated {item['label']}", 'type': 'negative', 'score': -item['score'], 'word': f"not {w}"})
                else:
                    triggers_pos.append({'label': item['label'], 'type': 'positive', 'score': item['score'], 'word': w})
                break

    for item in SENTIMENT_NEG:
        for w in item['words']:
            match = re.search(rf"\b{re.escape(w)}\b", lower)
            if match:
                start_idx = match.start()
                if _is_negated(lower, start_idx):
                    triggers_pos.append({'label': f"Negated {item['label']}", 'type': 'positive', 'score': -item['score'], 'word': f"not {w}"})
                else:
                    triggers_neg.append({'label': item['label'], 'type': 'negative', 'score': item['score'], 'word': w})
                break

    sentiment_score = sum(t['score'] for t in triggers_pos) + sum(t['score'] for t in triggers_neg)

    for key in list(entities.keys()):
        ent = entities[key]
        if ent['source'] != 'direct':
            continue
        if not ent['ticker']:
            continue

        ent['score'] += sentiment_score
        for t in triggers_pos:
            ent['reasons'].append(t['label'])
        for t in triggers_neg:
            ent['reasons'].append(t['label'])

    # --- Step 3: Sector Rules ---
    sector_hits = []

    for rule in SECTOR_RULES:
        matched = False
        for trigger in rule['triggers']:
            match = re.search(rf"\b{re.escape(trigger)}\b", lower)
            if match:
                # Ensure the trigger is not negated (e.g. "no recession expected")
                if not _is_negated(lower, match.start()):
                    matched = True
                    break
        if not matched:
            continue

        for effect in rule['effects']:
            sector_hits.append({
                'sector': effect['sector'],
                'direction': 'BULLISH' if effect['dir'] > 0 else 'BEARISH',
                'tickers': effect['tickers'],
                'reason': effect['reason'],
            })

            for ticker in effect['tickers']:
                if ticker not in entities:
                    meta = None
                    for v in ENTITIES.values():
                        if v['ticker'] == ticker:
                            meta = v
                            break
                    entities[ticker] = {
                        'ticker': ticker,
                        'name': meta['name'] if meta else ticker,
                        'sector': meta['sector'] if meta else 'unknown',
                        'score': 0,
                        'reasons': [],
                        'source': 'sector',
                    }
                entities[ticker]['score'] += effect['dir'] * SCORE['SECTOR_IMPACT']
                entities[ticker]['reasons'].append(effect['reason'])

    seen_sectors = set()
    sectors = []
    for s in sector_hits:
        if s['sector'] not in seen_sectors:
            seen_sectors.add(s['sector'])
            sectors.append(s)

    # --- Step 4: Relation Engine ---
    direct_keys = [k for k, v in entities.items() if v['source'] == 'direct' and v['ticker']]

    for key in direct_keys:
        entity = entities[key]
        rel = RELATIONS.get(entity['ticker'])
        if not rel:
            continue

        dir_sign = 1 if entity['score'] > 0 else -1 if entity['score'] < 0 else 0
        if dir_sign == 0:
            continue

        for sup in rel['suppliers']:
            if sup['ticker'] not in entities:
                meta = None
                for v in ENTITIES.values():
                    if v['ticker'] == sup['ticker']:
                        meta = v
                        break
                entities[sup['ticker']] = {
                    'ticker': sup['ticker'],
                    'name': sup['name'],
                    'sector': meta['sector'] if meta else 'relation',
                    'score': 0,
                    'reasons': [],
                    'source': 'relation',
                }
            entities[sup['ticker']]['score'] += dir_sign * SCORE['RELATION_SUPPLIER']
            entities[sup['ticker']]['reasons'].append(
                f"Supplier of {entity['ticker']}: {sup['reason']}"
            )

    # --- Step 5: Aggregate & Label ---
    stocks = []
    for e in entities.values():
        if not e['ticker'] or e['score'] == 0:
            continue
        if e['score'] >= SCORE['BULLISH_THRESHOLD']:
            signal = 'BULLISH'
        elif e['score'] <= SCORE['BEARISH_THRESHOLD']:
            signal = 'BEARISH'
        else:
            signal = 'NEUTRAL'
        stocks.append({
            'ticker': e['ticker'],
            'name': e['name'],
            'signal': signal,
            'score': round(e['score'], 2),
            'reasons': list(set(e['reasons'])),
            'source': e['source'],
        })

    stocks.sort(key=lambda x: abs(x['score']), reverse=True)

    all_scores = [s['score'] for s in stocks]
    if all_scores:
        overall_score = round(sum(all_scores) / len(all_scores), 2)
    else:
        overall_score = round(sentiment_score, 2)

    if overall_score >= SCORE['BULLISH_THRESHOLD']:
        signal = 'BULLISH'
    elif overall_score <= SCORE['BEARISH_THRESHOLD']:
        signal = 'BEARISH'
    else:
        signal = 'NEUTRAL'

    confidence = min(round(abs(overall_score) / 4 * 100), 99)

    return {
        'signal': signal,
        'score': overall_score,
        'confidence': confidence,
        'stocks': stocks,
        'sectors': sectors,
        'triggers': triggers_pos + triggers_neg,
        'meta': {
            'entitiesDetected': len(stocks),
            'triggersDetected': len(triggers_pos) + len(triggers_neg),
        },
    }
