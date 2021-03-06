import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-complexity',
  templateUrl: './complexity.component.html',
  styles: []
})

export class ComplexityComponent{

  update$: Subject<boolean> = new Subject();
  center$: Subject<boolean> = new Subject();
  zoomToFit$: Subject<boolean> = new Subject();

  links: any[] = [];
  nodes: any[] = [];
  pairInstruction: any[] = [];
  parentsInstructions: any = [];
  contentFilePerLine: any = [];
  contentLinePerWord: any = [];

  complexity: number = 0;

  javaInstructions = ['if', 'for', 'while', 'public', 'class', 'protected', 'private'];
  fileName: string = 'Select file';
  code: string = `print('Hola mundo')`;

  uploadFile: File;

  async selectScript(file: File){

    if (!file){
      this.uploadFile = file;
      return;
    }

    this.verifyFileType(file);

    this.uploadFile = file;

    this.fileName = this.uploadFile.name;

    this.code = await this.readFile();

    this.readFileLineByLine(this.code);
  }

  verifyFileType(file: File){

    if (file.type.indexOf('java') < 0){
      Swal.fire(
        {
          icon: 'error',
          title: 'Oops...',
          text: 'Por favor selecciona un archivo válido',
        }
      );
      this.uploadFile = null;
      return;
    }
  }

  readFile(): Promise<string>{

    return new Promise((res) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const content = fileReader.result;
        res(content.toString());
      };
      fileReader.readAsText(this.uploadFile);
    });
  }

  readFileLineByLine(contentFile: string){

    this.contentFilePerLine = contentFile.split('\n').map(line => line.trim()).filter(line => line !== '');

    this.complexity = this.calculateComplexity(this.contentFilePerLine);
  }

  calculateComplexity(contentFilePerLine: string[]): number{

    this.contentLinePerWord = this.getContentLinePerWord(contentFilePerLine);

    this.pairInstruction = this.getPairInstructions(contentFilePerLine, this.contentLinePerWord);

    this.parentsInstructions = this.getParentsInstructions(this.pairInstruction);

    this.drawAllNodesAndLinksWithFathers();

    const linksSize = this.links.length;
    const nodesSize = this.nodes.length;
    const methodsAmount = this.parentsInstructions[0].childrens.length;

    if (this.parentsInstructions[0].parent[0] === 'class'){
      return (linksSize - nodesSize + (2 * methodsAmount)) / methodsAmount;
    }

  }

  getContentLinePerWord(contentFilePerLine: string[]): string[][]{

    const contentLine: string[][] = [];

    contentFilePerLine.forEach((line: string) => {

        const wordsInLine = line.split(' ');
        contentLine.push(wordsInLine);
    });

    return contentLine;
  }

  getPairInstructions(contentFilePerLine: string[], contentLinePerWord: string[]) {

    const endPosition = contentFilePerLine.length;
    const initPosition = 0;
    const currentPositionsInstruction = [];
    const currentInstructions = [];
    let pairInstruction: any[] = [];

    for (let init = initPosition; init < endPosition; init++){

      const line = contentFilePerLine[init];

      const firstWordInLine = contentLinePerWord[init][0];

      const instructionByWord = this.getSpecificInstructionByWord(firstWordInLine);

      const indexInstruction = this.javaInstructions.indexOf(instructionByWord);

      if (indexInstruction > -1){

        currentPositionsInstruction.push(init);
        currentInstructions.push(instructionByWord);

      }

      if (line.includes('}') && !line.includes('else')){

        const currentInstruction = currentInstructions.pop();
        const currentPositionInstruction: number =  currentPositionsInstruction.pop();
        pairInstruction.push([currentInstruction, currentPositionInstruction, init]);

      }
    }
    pairInstruction = pairInstruction.filter(array => array.includes(undefined) === false);

    return pairInstruction;
  }

  getParentsInstructions(checkParents: any[]){

    if (this.verifyOnlyOneInstruction(checkParents)){
        this.drawInitialAndEndNodesWithLink(checkParents[0]);
        const notInstructionsInsideChildren = this.getArrayOfNotInstructionsInsideChildren(checkParents[0]);
        this.createNodesAndLinksForNotInstructionsInsideChildren(checkParents[0], notInstructionsInsideChildren);
    }

    checkParents = checkParents.sort((a, b) => a[1] - b[1]);

    let parents = [];

    for (const firstValue of checkParents) {

        const childrens: any = [];

        for (const secondValue of checkParents) {

          if (secondValue[1] > firstValue[1] && secondValue[2] < firstValue[2]){

            if (childrens.length > 0) {
              let isSon = true;

              for (const children of childrens) {
                if (secondValue[1] > children[1] && secondValue[2] < children[2]){
                  isSon = false;
                }
              }
              if (isSon){
                childrens.push(secondValue);
              }

            }else{
              childrens.push(secondValue);
            }
          }
        }

        const parent = {
          parent: firstValue,
          childrens
        };

        parents.push(parent);
    }

    /* Filtro el arreglo de padres, eliminando los padres que no tienen hijos */
    parents = parents.filter(parent =>  parent.childrens.length !== 0);

    return parents;
  }

  getSpecificInstructionByWord(instruction: string): string{

    for (const currentInstruction of this.javaInstructions) {

      if (instruction.includes(currentInstruction)){

        const newInstruction: string[] = instruction.split(currentInstruction)
                                                  .map(emptyInstruction =>  emptyInstruction.replace('', currentInstruction));

        return newInstruction[0];
      }
    }
    return instruction;
  }

  verifyOnlyOneInstruction(pairInstrucions){

    if (pairInstrucions.length === 1){
      return true;
    }
    return false;
  }

  drawAllNodesAndLinksWithFathers(){

    /*  Ordenamos el arreglo de instrucciones padres */
    this.parentsInstructions = this.parentsInstructions.sort((a, b) => a.parent[1] - b.parent[1]);

    this.parentsInstructions.forEach(parent => {

      const currentParent = parent.parent;

      if (!this.existNodeInGraph(`N${currentParent[1]}`)) {

        this.drawInitialAndEndNodesWithLink(currentParent);

        if (parent.childrens.length > 0){

          this.drawChildrenWithLink(parent);

          if (parent.childrens.length > 1){
            this.drawBrothers(parent);
          }
        }
      }else{
        if (parent.childrens.length > 0){

          this.drawChildrenWithLink(parent);

          if (parent.childrens.length > 1){
            this.drawBrothers(parent);
          }
        }
      }
    });
  }

  /*  Dibujar instrucción tanto su inicio como finalización y su respectivo Link */
  drawInitialAndEndNodesWithLink(pairInstruction){
    this.createNodeForGraph(pairInstruction[1]);
    this.createNodeForGraph(pairInstruction[2]);

    let isIfAndHasElse;

    if (pairInstruction[0] === 'if'){
      isIfAndHasElse = this.verifyIfInstructionHasElse(pairInstruction);
    }

    if (pairInstruction[0] !== 'private'){
      if (pairInstruction[0] !== 'protected'){
        if (pairInstruction[0] !== 'public'){
          if (!isIfAndHasElse){
            if (pairInstruction[0] !== 'class'){
              this.createLinkForGraph(pairInstruction[1], pairInstruction[2]);
            }
          }
        }
      }
    }
  }

  /* Verifica si una instrucción hija también es padre */
  verifyIfChildrenIsAlsoParent(children: any){

    let isParent = false;

    this.parentsInstructions.forEach(parent => {

      if (parent.parent === children){
        isParent = true;
      }
    });

    return isParent;
  }

  /* Obtener las líneas de código que no son instrucciones(If, for, ...) */
  getArrayOfNotInstructions(parent: any): number[]{

    const notInstructions: number[] = [];

    const initialValue = parent.parent[1];

    const endValue = parent.parent[2];

    for (let init = initialValue + 1; init < endValue; init++) {

      let insideSon = false;

      parent.childrens.forEach( currentChildren => {

        if (init >= currentChildren[1] && init <= currentChildren[2]){
          insideSon = true;
        }
      });

      if (!insideSon){
        notInstructions.push(init);
      }
    }
    return notInstructions;
  }

  drawChildrenWithLink(parent: any){
    parent.childrens.forEach(children  => {

      if (!this.existNodeInGraph(`N${children[1]}`)) {
        /* Creamos el nodo  para la instrucción hija con su respectivo nodo de terminación y el enlace entre ellos*/
        this.drawInitialAndEndNodesWithLink(children);
      }
      /* Verificamos todas las instrucciones que no son padres
      Tomando en cuenta que una instrucción que es hijo, también puede ser padre
      */
      const isParent = this.verifyIfChildrenIsAlsoParent(children);

      if (!isParent){

        const notInstructionsInsideChildren = this.getArrayOfNotInstructionsInsideChildren(children);

        this.createNodesAndLinksForNotInstructionsInsideChildren(children, notInstructionsInsideChildren);
      }
    });

    const notInstructions = this.getArrayOfNotInstructions(parent);
    this.createNodesAndLinksForNotInstructions(parent, notInstructions);
  }

  getArrayOfNotInstructionsInsideChildren(instructionParent){

    const initialValue = instructionParent[1];
    const endValue = instructionParent[2];

    const notInstructions: number[] = [];

    for (let init = initialValue + 1; init < endValue; init++) {
      notInstructions.push(init);
    }

    return notInstructions;
  }

  verifyIfInstructionHasElse(pairInstruction): number{

    const initialValue = pairInstruction[1] + 1;
    const endPosition = pairInstruction[2];

    for (let init = initialValue; init < endPosition; init++){

      const line = this.contentFilePerLine[init];

      if (line.includes('else')){
        return init;
      }
    }
    return null;
  }

  createNodesAndLinksForNotInstructions(parent: any, notInstructions: any[]){

    /* Si es que no hay lineas entre una instrucción padre e hija, se hace el link entre ellas*/
    if (notInstructions.length === 0){
      this.createLinkForGraph(parent.parent[1], parent.childrens[0][1]);
      this.createLinkIfParentIsLoopInstruction(parent.parent, this.getLastChildrenEndOfParent(parent));
    }

    let isParentInitLinked = false;
    let isParentEndLinked = false;

    // tslint:disable-next-line: prefer-for-of
    for (let init = 0; init < notInstructions.length; init++) {
      /* Creamos el nodo para la no instrucción */
      this.createNodeForGraph(notInstructions[init]);
      /* Para establecer el enlace con el padre(Inicio) */
      if (notInstructions[init] - 1 === parent.parent[1]){
        isParentInitLinked = true;
        this.createLinkForGraph(parent.parent[1], notInstructions[init]);
        /* Si es que en caso hay un solo elemento de no Instrucciones*/
        if (notInstructions.length === 1){
          this.createLinkForGraph(notInstructions[0], parent.childrens[0][1]);
          this.createLinkIfParentIsLoopInstruction(parent.parent, this.getLastChildrenEndOfParent(parent));
        }
      }

      if (notInstructions[init] + 1 === parent.parent[2]){
        /* Para establecer el enlace con algun hijo(Fin) del padre*/
        isParentEndLinked = true;
        this.createLinkIfParentIsLoopInstruction(parent.parent, notInstructions[init]);
        if (notInstructions.length === 1){
          this.createLinkForGraph(parent.childrens[parent.childrens.length - 1][2], notInstructions[0]);
          this.createLinkForGraph(parent.parent[1], parent.childrens[0][1]);
          this.createLinkIfParentIsLoopInstruction(parent.parent, notInstructions[init]);
        }
      }

      if (notInstructions.length === 1){
        if (parent.childrens.length > 1){
          for (let initial = 0; initial <  parent.childrens.length - 1; initial++) {
            if (notInstructions[0] + 1 === parent.childrens[initial + 1][1] && notInstructions[0] - 1 === parent.childrens[initial][2]){
              this.createLinkForGraph(parent.childrens[initial][2], notInstructions[0]);
              this.createLinkForGraph(notInstructions[0], parent.childrens[initial + 1][1]);
              this.createLinkForGraph(parent.parent[1], parent.childrens[0][1]);
              this.createLinkIfParentIsLoopInstruction(parent.parent, this.getLastChildrenEndOfParent(parent));
            }
          }
        }
      }

      if (!isParentInitLinked){
        this.createLinkForGraph(parent.parent[1], parent.childrens[0][1]);
      }

      if (init === notInstructions.length - 1 && !isParentEndLinked ){
        this.createLinkIfParentIsLoopInstruction(parent.parent, this.getLastChildrenEndOfParent(parent));
      }

      parent.childrens.forEach(children => {

        if (notInstructions[init] + 1 === children[1]){
          /* Para establecer el enlace con algun hijo(Inicio) del padre*/
          this.createLinkForGraph(notInstructions[init], children[1] );
        }
        if (notInstructions[init] - 1 === children[2]){
          /* Para establecer el enlace con algun hijo(Fin) del padre*/
          this.createLinkForGraph(children[2], notInstructions[init]);
        }
        this.createLinkForGraph(notInstructions[init] - 1, notInstructions[init]);
      });
    }
  }

  getLastChildrenEndOfParent(parent){
    return parent.childrens[parent.childrens.length - 1][2];
  }

  /* Crea los nodos y los links entre el primer hijo y el padre*/
  createNodesAndLinksForNotInstructionsInsideChildren(containerNotInstructions, notInstructions: any[]){

    const instruction = containerNotInstructions[0];
    const elsePosition = this.verifyIfInstructionHasElse(containerNotInstructions);
    notInstructions = notInstructions.filter(currentNotInstruction => currentNotInstruction !== elsePosition );

    if (instruction === 'if' && elsePosition){

      const initElseValueLine = containerNotInstructions[2];

      for (let init = elsePosition + 1; init < initElseValueLine; init++) {

        notInstructions = notInstructions.filter(currentNotInstruction => currentNotInstruction !== init );
        /* Creamos el nodo para la no instrucción */
        this.createNodeForGraph(init);

        if (init === elsePosition + 1){
          this.createLinkForGraph(containerNotInstructions[1], init);
        }
        /* En caso que exista más de dos noInstrucciones*/
        if ( init > elsePosition + 1){
          this.createLinkForGraph(init - 1, init);
        }
        /* Si es que es la ultima instrucción hacemos el enlace con el hijo */
        if (init === initElseValueLine - 1){
          this.createLinkForGraph(init, initElseValueLine);
        }
      }
    }

    for (let init = 0; init < notInstructions.length; init++) {
      /* Creamos el nodo para la no instrucción */
      this.createNodeForGraph(notInstructions[init]);
      if (init === 0){
        this.createLinkForGraph(containerNotInstructions[1], notInstructions[init]);
      }
      /* En caso que exista más de dos noInstrucciones*/
      if (notInstructions.length > 1){
        this.createLinkForGraph(notInstructions[init] - 1, notInstructions[init]);
      }
      /* Si es que es la ultima instrucción hacemos el enlace con el hijo */
      if (init === notInstructions.length - 1){
        this.createLinkIfParentIsLoopInstruction(containerNotInstructions, notInstructions[init]);
      }

    }
  }

  createLinkIfParentIsLoopInstruction(parent: any, notInstruction){

    if (parent[0] === 'for' || parent[0] === 'while'){
      this.createLinkForGraph(notInstruction, parent[1]);
    }else{
      this.createLinkForGraph(notInstruction, parent[2]);
    }
  }

  drawBrothers(parent: any){
      /* Ordenar Hermanos */
      const checkBrothers: any[] = parent.childrens.sort((a, b) => a[1] - b[1]);

      for (let init = 0; init < checkBrothers.length; init++) {
        if (checkBrothers[init][0] !== 'public'){
          if (init + 1 !== checkBrothers.length){
            if (checkBrothers[init][2] + 1 === checkBrothers[init + 1][1]){
              const source = checkBrothers[init][2];
              const target = checkBrothers[init + 1][1];
              this.createLinkForGraph(source, target);
            }
          }
        }
    }
  }

  /* Methods for Graph */
  existNodeInGraph(idNode: string){
    for (const node of this.nodes) {
      if (node.id === idNode){
        return true;
      }
    }
    return false;
  }

  createNodeForGraph(nodeIdentifier: any){

    const idNode = `N${nodeIdentifier}`;
    const label = idNode.toUpperCase();

    const node: any = {
      id : idNode,
      label
    };

    if (!this.nodes.includes(node)){
      this.nodes.push(node);
      this.nodes = [...this.nodes];
    }
  }

  createLinkForGraph(source: any, target: any){

    source = `N${source}`;
    target = `N${target}`;

    const link: any = {
      id : 'L',
      source,
      target,
      label : 'Custom Label'
    };

    let isLinkSaved = false;
    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.links.length; index++) {
      if (this.links[index].source === source && this.links[index].target === target){
        isLinkSaved = true;
        return;
      }
    }
    if (!isLinkSaved){
      this.links.push(link);
      this.links = [...this.links];
    }
  }

  updateGraph() {
    this.update$.next(true);
  }

  centerGraph() {
    this.center$.next(true);
  }

  fitGraph() {
    this.zoomToFit$.next(true);
  }
}
