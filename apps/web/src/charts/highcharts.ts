// The one place Highcharts is imported and configured. Components import
// Highcharts from here so the extra modules and the dark theme are always loaded.
import Highcharts from 'highcharts'
import 'highcharts/highcharts-more' // needed by solid gauge
import 'highcharts/modules/solid-gauge'
import 'highcharts/modules/accessibility' // keyboard + screen-reader support
import { highchartsTheme } from './highchartsTheme'

Highcharts.setOptions(highchartsTheme)

export { Highcharts }
