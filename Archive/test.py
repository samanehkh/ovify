from bs4 import BeautifulSoup
with open('index.html', 'r') as f:
    html = f.read()
soup = BeautifulSoup(html, 'html.parser')
print("Parsing complete.")
