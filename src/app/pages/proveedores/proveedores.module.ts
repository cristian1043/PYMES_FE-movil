import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { ProveedoresPageRoutingModule } from './proveedores-routing.module';
import { ProveedoresPage } from './proveedores.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProveedoresPageRoutingModule
  ],
  declarations: [ProveedoresPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProveedoresPageModule {}
