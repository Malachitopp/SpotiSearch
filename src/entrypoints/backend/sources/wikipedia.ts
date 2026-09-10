import * as cheerio from "cheerio";


const USER_AGENT = "SpotiSearch/0.1 (contact:malachitopp05@gmail.com)";
const months: Record<string,string> = {
        January: "01",
        February: "02",
        March: "03",
        April:"04",
        May:"05",
        June:"06",
        July:"07",
        August:"08",
        September:"09",
        October:"10",
        November:"11",
        December:"12",
    };
type Release = {
    date:string | null;
    artist: string;
    title: string;
}
    
function toISODate(date: string,title: string): string | null{
    const split =/^([A-Za-z]+)\s*(\d+)$/.exec(date)
    const year = /(\d{4})/.exec(title)?.[1] 
    if (split === null) return null; 


    const monthName = split[1];
    const day = split[2];
    if (monthName === undefined || day === undefined) return null;
    const month =months[monthName];
    if (month === undefined) {
        console.warn(`unrecognised month: ${monthName}`);
        return null; 
    }
    if (year === undefined) return null;

    const assemble = `${year}-${month}-${day.padStart(2,"0")}`
    return assemble 
}

export async function fetchPage(title:string) {
    const response= await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&prop=text&formatversion=2&format=json`,
    {headers: {"User-Agent":USER_AGENT}});
    const data = await response.json();
    return data;
}

const releases:Release[] = [];

export async function parse(title:string){
    const data = await fetchPage(title);
    const htmlString = data.parse.text;
    const $ = cheerio.load(htmlString);
    const tables = $("table.wikitable");
    
    let lastDate = "";
   

    for (let i = 0; i < tables.length; i ++){
        const rows = $(tables[i]).find("tr");
        rows.each((j, row) => {
            const cells = $(row).children();
            
            if (cells.filter("td").length < 2) return ; 

            const firstCell = $(row).children().first();
            if (firstCell.is("th")) {
                lastDate= firstCell.text().trim();
            }
            const tds = cells.filter("td");
            releases.push({
                date:toISODate(lastDate, title),
                artist: $(tds[0]).text().trim(),
                title:$(tds[1]).text().trim(),
            });
        });


    }
    return releases;

}

