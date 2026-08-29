import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { ComprasPageRoutingModule } from './compras-routing.module';
import { ComprasPage } from './compras.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComprasPageRoutingModule
  ],
  declarations: [ComprasPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComprasPageModule {}
