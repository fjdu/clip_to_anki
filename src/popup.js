// Anki connect: https://foosoft.net/projects/anki-connect/index.html

function addItemsToSelect(e, items) {
  for (i in items) {
    var opt = document.createElement('option');
    opt.value = items[i];
    opt.innerHTML = items[i];
    e.add(opt);
  }
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
  try {
    return doc.getElementsByTagName('title').item(0).textContent.trim().split(/\s+/).join(' ');
  } catch(e) {
    console.log(e);
    return '';
  }
}

function getSummary(doc) {
  try {
    return doc.getElementsByTagName('summary').item(0).textContent.trim().replace(/(?<=\S)\n(?=\S)/g, ' ');
  } catch(e) {
    console.log(e);
    return '';
  }
}


function getUpdateDate(doc) {
  try {
    return doc.getElementsByTagName('updated').item(0).textContent.trim();
  } catch(e) {
    console.log(e);
    return '';
  }
}


function getPublishDate(doc) {
  try {
    return doc.getElementsByTagName('published').item(0).textContent.trim();
  } catch(e) {
    console.log(e);
    return '';
  }
}


function getLinks(doc) {
  var links = {};
  try {
    var items = doc.getElementsByTagName('link');
    for (var i=0; i<items.length; ++i) {
      if (items.item(i).getAttribute('type') == 'application/pdf') {
        links['pdf_link'] = items.item(i).getAttribute('href');
      }
      if (items.item(i).getAttribute('type') == 'text/html') {
        links['html_link'] = items.item(i).getAttribute('href');
      }
    }
  } catch(e) {
    console.log(e);
  }
  return links;
}


function getAuthors(doc) {
  var authors = [];
  try {
    var items = doc.getElementsByTagName('author');
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
  } catch(e) {
    console.log(e);
  }
  return authors;
}


function getCategories(doc) {
  var categories = [];
  try {
    var items = doc.getElementsByTagName('category');
    if (items) {
      for (var i=0; i<items.length; ++i) {
        var a = items.item(i);
        categories.push(a.getAttribute('term'));
      }
    }
  } catch(e) {
    console.log(e);
  }
  return categories;
}


function getComments(doc) {
  try {
    return doc.getElementsByTagName('arxiv:comment').item(0)
           .textContent.trim().replace(/\n+/g, ' ');
  } catch(e) {
    console.log(e);
    return '';
  }
}


function invoke(action, version, params={}) {
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
                    throw response.error;
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


function moveElementToBegin(L, e) {
  var idx = L.indexOf(e);
  if (idx == -1) {
    return L;
  }
  L.splice(idx, 1);
  L.unshift(e);
}


function setDecks() {
  invoke("deckNames", 6).then(function (res) {
    moveElementToBegin(res, 'Papers');
    addItemsToSelect(document.getElementById("deckName"), res);
  });
}


function setModels() {
  invoke("modelNames", 6).then(function (res) {
    moveElementToBegin(res, 'Paper');
    addItemsToSelect(document.getElementById("modelName"), res);
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

  var deck = document.getElementById("deckName");
  var model = document.getElementById("modelName");
  var deckName = deck.options[deck.selectedIndex].text;
  var modelName = model.options[model.selectedIndex].text;

  var year = "Publish: " + document.getElementById("published").value + "<br>Update: " + document.getElementById("updated").value;

  var d = {"note": {
    "deckName": deckName,
    "modelName": modelName,
    "fields": {
      "Front": front.replace(/\n+/g, '<br>'),
      "Back": summary.replace(/\n+/g, '<br>'),
      "Year": year,
      "Author": author.replace(/\n+/g, '<br>'),
      "Title": title,
      "URL": url,
      "Journal": journal
    },
    "options": {"allowDuplicate": false},
    "tags": tags.split(/[ ,]+/)
  }};
  try {
    const result = await invoke("addNote", 6, d);
    document.getElementById("status").value = `Anki: ${result}`;
  } catch (e) {
    document.getElementById("status").value = `Anki: ${e}`;
  }
}


function retrievePageInfo() {
  chrome.tabs.query({active: true, currentWindow: true},
    function(tabs) {
      var tab = tabs[0];
      var url = tab.url;
      var site = getSite(url);
      if (!site) {
        document.getElementById("status").value = "Site not supported: " + url;
        return;
      }

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
}


function setUpAnkiDeckInfo() {
  setDecks();
  setModels();
  var fields = ["Front", "Back", "Year", "Author", "Title", "URL", "Journal"];
  document.getElementById("fields").value = fields.join(' ');
}


function getCurrentTags() {
  return document.getElementById("tags").value.trim().split(/\s+/);
}


function setTags(t) {
  return document.getElementById("tags").value = t.join(' ');
}


var ankiTags = [];
var previousTags = [];
var currentTags = [];
var candidate=[];
var iDiff=-1;
const maxCandidate=8;


function inputTags(ev) {
  currentTags = getCurrentTags();
  if (ev.keyCode == 32) {
    previousTags = currentTags;
    candidate = [];
    document.getElementById("status").value = "";
    return;
  }
  if (ev.keyCode == 13) {
    if (candidate) {
      currentTags[iDiff] = candidate[0];
      setTags(currentTags);
      previousTags = currentTags;
      candidate = [];
      document.getElementById("status").value = "";
    }
    return;
  }
  if (ev.key == ']') {
    var t = candidate.shift();
    candidate.push(t);
    document.getElementById("status").value = `${candidate}`;
    return;
  }
  if (ev.key == '[') {
    var t = candidate.pop();
    candidate.unshift(t);
    document.getElementById("status").value = `${candidate}`;
    return;
  }
  var len=Math.max(currentTags.length, previousTags.length);
  var dif = '';
  for (var i=0; i<len; ++i) {
    if (currentTags[i] != previousTags[i]) {
      dif = currentTags[i];
      iDiff = i;
      break;
    }
  }
  if (dif) {
    dif = dif.toLowerCase();
    candidate = [];
    for (var i in ankiTags) {
      if (ankiTags[i].toLowerCase().startsWith(dif)) {
        var already = false;
        for (var j in currentTags) {
          if (currentTags[j] === ankiTags[i]) {
            already = true;
            break;
          }
        }
        if (!already) {
          candidate.push(ankiTags[i]);
        }
      }
      if (candidate.length > maxCandidate) {
        break;
      }
    }
  }
  if (candidate) {
    document.getElementById("status").value = `${candidate}`;
    previousTags = currentTags;
  }
}


invoke("getTags", 6).then(
  function(r) {
    ankiTags = r;
    document.getElementById("tags").addEventListener("keyup", inputTags);
  });

document.addEventListener('DOMContentLoaded',
function() {
  document.getElementById("status").value = 'Loading...';
  setUpAnkiDeckInfo();
  retrievePageInfo();
  previousTags = getCurrentTags();
  document.getElementById("ClipToAnki").addEventListener("click", clipToAnki);
});
