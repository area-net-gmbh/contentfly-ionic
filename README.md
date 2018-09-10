![Contentfly CMS](https://www.contentfly-cms.de/file/get/7d937604-23e2-11e8-b76e-00ac10d52400)

# Contentfly
- **Lizenz**: Duale Lizenz AGPL v3 / Properitär
- **Webseite**: http://www.contentfly-cms.de

## Die Contentfly Plattform

- **CMS**: https://github.com/area-net-gmbh/contentfly-cms
- **Ionic SDK**: https://github.com/area-net-gmbh/contentfly-ionic
- **Dokumentation**: https://www.contentfly-cms.de

## Einführung

Mit der Contentfly Plattform können mobile Apps für iOS und Android unter dem Einsatz von nativen und webbasierten Technologien inklusive Synchronisations-Anbindung an einen Server entwickelt werden.

Der Server basiert dabei auf PHP und MySQL und kann auf nahezu jedem Standard-Hosting-Provider eingesetzt werden. Die SDKs für iOS und Android unterstützen Entwickler bei der Datenhaltung, Synchronisation und Darstellung von Inhalten. Zudem enhalten die SDKs eine Template-Engine, mit der Oberflächen einfach und plattformübergreifen in HTML erstellt werden können.

Es ist dem Entwickler völlig freigestellt, ob Apps komplett nativ oder in Kombination mit webbasierten Bereichen umgesetzt werden.

Die Contentfly Plattform ist kein Baukasten-System, mit dem sich Apps ohne Vorkenntnisse zusammenklicken lassen - sondern bietet ein technisches Rahmenwerk, mit sich mobile Apps effizient, kosten-nutzenoptimiert, aber dennoch frei von Zwängen anderer (hybrider) Frameworks wie Titanium Mobile oder PhoneCap.

Für die Entwicklung von Apps mit dem Contentfly Framework sind folgende Kenntnisse erforderlich:

- **CMS**: PHP und optimalerweise Doctrine und MySQL
- **Ionic**: Typescript/Javascript und Kenntnisse im Ionic Framework

# Ionic SDK

## Installation

**Installation per NPM**
`npm install contentfly-ionic`

**src/app/app.module.ts**
```
...
import {ContentflyModule} from "contentfly-ionic";

@NgModule({
  declarations: [
    ...
  ],
  imports: [
    ...
    ContentflyModule.forRoot({
      baseUrl: 'https://url.zum-contentfly-cms.de/'
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp
  ],
  providers: [
    ...
  ]
})
export class AppModule {}

```

# Lizenz

Die Contentfly Plattform ist unter eine dualen Lizenz (AGPL v3 und properitär) verfügbar. Die genauen Lizenzbedingungen sind in der Datei _licence.txt_ zu finden.

# Die Contentfly Plattform ist ein Produkt der AREA-NET GmbH

AREA-NET GmbH
Öschstrasse 33
73072 Donzdorf

**Kontakt**

- Telefon: 0 71 62 / 94 11 40
- Telefax: 0 71 62 / 94 11 18
- http://www.area-net.de
- http://www.app-agentur-bw.de
- http://www.Contentfly-cms.de


**Geschäftsführer**
Gaugler Stephan, Köller Holger, Schmid Markus

**Handelsregister**
HRB 541303 Ulm
Sitz der Gesellschaft: Donzdorf
UST-ID: DE208051892




