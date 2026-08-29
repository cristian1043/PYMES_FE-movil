import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  cubeSharp,
  documentTextOutline,
  documentTextSharp,
  peopleOutline,
  peopleSharp,
  barChartOutline,
  barChartSharp,
  logOutOutline,
  logOutSharp,
  storefrontOutline,
  storefrontSharp,
  personOutline,
  personSharp,
  lockClosedOutline,
  lockClosedSharp,
  callOutline,
  mailOutline,
  cashOutline,
  alertCircleOutline,
  personCircleOutline,
  cardOutline,
  fingerPrintOutline,
  busOutline,
  cartOutline,
  shieldCheckmarkOutline,
  trashOutline,
  addOutline,
  businessOutline
} from 'ionicons/icons';

// Register all required Ionicons explicitly to avoid URL construction errors
addIcons({
  'cube-outline': cubeOutline,
  'cube-sharp': cubeSharp,
  'document-text-outline': documentTextOutline,
  'document-text-sharp': documentTextSharp,
  'people-outline': peopleOutline,
  'people-sharp': peopleSharp,
  'bar-chart-outline': barChartOutline,
  'bar-chart-sharp': barChartSharp,
  'log-out-outline': logOutOutline,
  'log-out-sharp': logOutSharp,
  'storefront-outline': storefrontOutline,
  'storefront-sharp': storefrontSharp,
  'person-outline': personOutline,
  'person-sharp': personSharp,
  'lock-closed-outline': lockClosedOutline,
  'lock-closed-sharp': lockClosedSharp,
  'call-outline': callOutline,
  'mail-outline': mailOutline,
  'cash-outline': cashOutline,
  'alert-circle-outline': alertCircleOutline,
  'person-circle-outline': personCircleOutline,
  'card-outline': cardOutline,
  'finger-print-outline': fingerPrintOutline,
  'bus-outline': busOutline,
  'cart-outline': cartOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'trash-outline': trashOutline,
  'add-outline': addOutline,
  'business-outline': businessOutline
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
