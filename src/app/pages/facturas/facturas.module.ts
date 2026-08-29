import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { FacturasPageRoutingModule } from './facturas-routing.module';
import { FacturasPage } from './facturas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FacturasPageRoutingModule
  ],
  declarations: [FacturasPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FacturasPageModule {}
