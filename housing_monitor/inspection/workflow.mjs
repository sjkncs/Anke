import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {validateEvidence,assessEvidence,graphQuery} from './evidence.mjs';
const require=createRequire(import.meta.url);
export function createInspectionWorkflow({moduleRoot=process.env.ANKE_AI_NODE_MODULES,neo4j,segment}={}){
 const load=name=>moduleRoot?require(moduleRoot+'/'+name):require(name);
 const {StateGraph,Annotation,START,END}=load('@langchain/langgraph');
 const {RunnableLambda}=load('@langchain/core/runnables');
 const State=Annotation.Root({input:Annotation(),evidence:Annotation(),findings:Annotation(),graph:Annotation(),persistence:Annotation()});
 const validate=RunnableLambda.from(async state=>{let input=state.input,model=null;if(input.automatic){if(!input.image)throw Error('请先选择图像');if(!segment)throw Error('尚未连接分割模型服务');const result=await segment(input.image);input={...input,objects:result.objects};model={name:result.model||null,revision:result.revision||null,sha256:result.sha256||null,provider:result.provider||null};}return {evidence:{...validateEvidence(input),observationId:randomUUID(),model}};});
 const assess=RunnableLambda.from(state=>({findings:assessEvidence(state.evidence)}));
 const prepare=RunnableLambda.from(state=>({graph:graphQuery(state.evidence,state.findings)}));
 const persist=RunnableLambda.from(async state=>({persistence:state.input.persist?(neo4j?await neo4j(state.graph):(()=>{throw Error('尚未配置 Neo4j');})()):{status:'not_requested'}}));
 return new StateGraph(State).addNode('validate',s=>validate.invoke(s)).addNode('assess',s=>assess.invoke(s)).addNode('prepare_graph',s=>prepare.invoke(s)).addNode('persist',s=>persist.invoke(s)).addEdge(START,'validate').addEdge('validate','assess').addEdge('assess','prepare_graph').addEdge('prepare_graph','persist').addEdge('persist',END).compile();
}
