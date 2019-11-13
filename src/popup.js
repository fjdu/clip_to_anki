function start(afterStart) {
  chrome.tabs.query({active: true, currentWindow: true},
    function(tabs) {
      var tab = tabs[0];
      var url = tab.url;
      var site = getSite(url);
      if (!site) {
        document.getElementById("status").value = "Site not supported: " + url;
        return;
      }
      console.log(site);

      var url_parts = url.split('/');
      var len = url_parts.length;
      var id = url_parts[len-1].replace('.pdf', '');

      var x = new XMLHttpRequest();
      x.onreadystatechange = function() {
        if (x.readyState == XMLHttpRequest.DONE) {
          const doc = x.responseXML.documentElement.getElementsByTagName('entry').item(0);
          console.log(doc);

          var title = getTitle(doc);
          var summary = getSummary(doc);
          var authors = getAuthors(doc);
          var update_date = getUpdateDate(doc);
          var publish_date = getPublishDate(doc);
          var links = getLinks(doc);
          var categories = getCategories(doc);
          var comments = getComments(doc);

          var authors_string = author2string(authors);

          document.getElementById("front").value = title;
          document.getElementById("title").value = title;
          document.getElementById("authors").value = authors_string;
          document.getElementById("summary").value = summary;
          document.getElementById("tags").value = categories.join(' ');
          document.getElementById("updated").value = update_date;
          document.getElementById("published").value = publish_date;
          document.getElementById("html").setAttribute("href", links["html_link"]);
          document.getElementById("pdf").setAttribute("href", links["pdf_link"]);
          document.getElementById("comments").value = comments;

          document.getElementById("status").value = "Ready";
        }
      };
      x.open('GET', 'http://export.arxiv.org/api/query?id_list='+id);

      try {
        x.send();
      } catch (error) {
        console.log(error);
      }
    }
  );
  afterStart();
}


function getSite(url) {
  regexs = {
    'arxiv': /http[s]*:\/\/arxiv\.org\/.*/,
    'ads': /http[s]*:\/\/.*.adsabs\.harvard\.edu\/.*/,
  };
  for (r in regexs) {
    if (url.match(regexs[r])) {
      return r;
    }
  }
}


function author2string(authors) {
  var r = [];
  for (var i=0; i<authors.length; ++i) {
    var tmp = (i+1).toString() + ". " + authors[i]["name"];
    var affil = authors[i]['arxiv:affiliation'];
    if (affil) {
      tmp += " (" + affil + ")";
    }
    r.push(tmp);
  }
  return r.join('\n');
}


function getTitle(doc) {
  return doc.getElementsByTagName('title').item(0).textContent.trim().split(/\s+/).join(' ');
}


function getSummary(doc) {
  return doc.getElementsByTagName('summary').item(0).textContent.trim().replace(/(?<=\S)\n(?=\S)/g, ' ');
  //return doc.getElementsByTagName('summary').item(0).textContent.trim().split(/\n/).join(' ');
}


function getUpdateDate(doc) {
  return doc.getElementsByTagName('updated').item(0).textContent.trim();
}


function getPublishDate(doc) {
  return doc.getElementsByTagName('published').item(0).textContent.trim();
}


function getLinks(doc) {
  var items = doc.getElementsByTagName('link');
  var links = {};
  for (var i=0; i<items.length; ++i) {
    if (items.item(i).getAttribute('type') == 'application/pdf') {
      links['pdf_link'] = items.item(i).getAttribute('href');
    }
    if (items.item(i).getAttribute('type') == 'text/html') {
      links['html_link'] = items.item(i).getAttribute('href');
    }
  }
  return links;
}


function getAuthors(doc) {
  var items = doc.getElementsByTagName('author');
  var authors = [];
  for (var i=0; i<items.length; ++i) {
    var a = items.item(i);
    var aname = "";
    var tmp = a.getElementsByTagName('name').item(0);
    if (tmp) {
      aname = tmp.textContent;
    }
    var affil = "";
    tmp = a.getElementsByTagName('arxiv:affiliation').item(0);
    if (tmp) {
      affil = tmp.textContent;
    }
    authors.push({'name': aname, 'arxiv:affiliation': affil});
  }
  return authors;
}


function getCategories(doc) {
  var items = doc.getElementsByTagName('category');
  var categories = [];
  if (items) {
    for (var i=0; i<items.length; ++i) {
      var a = items.item(i);
      categories.push(a.getAttribute('term'));
    }
  }
  return categories;
}


function getComments(doc) {
  return doc.getElementsByTagName('arxiv:comment').item(0)
         .textContent.trim().replace(/\n+/g, ' ');
}


async function invoke(action, version, params={}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => reject('failed to issue request'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (Object.getOwnPropertyNames(response).length != 2) {
                    throw 'response has an unexpected number of fields';
                }
                if (!response.hasOwnProperty('error')) {
                    throw 'response is missing required error field';
                }
                if (!response.hasOwnProperty('result')) {
                    throw 'response is missing required result field';
                }
                if (response.error) {
                    //throw response.error;
                    resolve(response.error);
                }
                resolve(response.result);
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        xhr.send(JSON.stringify({action, version, params}));
    });
}


async function clipToAnki() {
  var front = document.getElementById("front").value;
  var title = document.getElementById("title").value;
  var summary = document.getElementById("summary").value;
  var author = document.getElementById("authors").value;
  var url = document.getElementById("html").getAttribute("href");
  var tags = document.getElementById("tags").value.trim();
  var journal = document.getElementById("journal").value;
  var year = "Publish: " + document.getElementById("published").value + "\nUpdate: " + document.getElementById("updated").value;

  var d = {"note": {
    "deckName": "Papers",
    "modelName": "Paper",
    "fields": {
      "Front": front,
      "Back": summary,
      "Year": year,
      "Author": author,
      "Title": title,
      "URL": url,
      "Journal": journal
    },
    "options": { "allowDuplicate": false },
    "tags": tags.split(/[ ,]+/)
  }};
  const result = await invoke("addNote", 6, d);
  document.getElementById("status").value = `${result}`;
}


start(
  function() { 
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById("ClipToAnki").addEventListener("click", clipToAnki);
    });
  }
);
