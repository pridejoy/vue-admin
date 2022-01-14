import { defineComponent, onMounted, onUnmounted, ref, watch, Transition, Teleport } from "vue";
import "./dialog.scss";

const isFirefox = navigator.userAgent.toLocaleLowerCase().indexOf("firefox") > 0;

/** 全局定位层级，每使用一个组件累加一次 */
let zIndex = 1000;

/** 基础弹出框组件 */
export default defineComponent({
    name: "base-dialog",
    props: {
        title: {
            type: String,
            default: "提示"
        },
        /** 双向绑定显示隐藏值 */
        modelValue: {
            type: Boolean,
            default: false
        },
        /** 弹出层内容区域宽度 */
        width: {
            type: String,
            default: "50%"
        },
        /** 是否可以通过点击遮罩层关闭`Dialog` */
        closeByMask: {
            type: Boolean,
            default: true
        },
        /** `Dialog`自身是否插入至`body`元素上。嵌套的`Dialog`必须指定该属性并赋值为`true` */
        appendToBody: {
            type: Boolean,
            default: false
        }
    },
    setup(props, context) {
        /** 当前使用的层级 */
        const _zIndex = zIndex;
        // 累加
        zIndex++;
        /** 当前组件节点 */
        const dialog = ref<HTMLElement>();
        /** 关闭按钮节点 */
        const closeBtn = ref<HTMLElement>();
        
        /** 内容盒子`x`轴偏移位置 */
        const contentX = ref("0");

        /** 内容盒子`y`轴偏移位置 */
        const contentY = ref("0");
        
        /** 因为需要动态设置偏移位置，所以设置完位置之后单独控制该节点切换动画 */
        const contentShow = ref(false);

        /** 内容盒子过渡动画 */
        const contentMove = ref(false);

        let timer!: NodeJS.Timeout;

        watch(() => props.modelValue, function(val) {
            timer && clearTimeout(timer);
            if (!val) {
                contentShow.value = false;
            }
        })

        /**  
         * 设置内容区域位置
         * @param e 鼠标事件
         */
        function setContentPosition(e: MouseEvent) {
            // 只有在外部点击，且关闭的情况下才会记录坐标
            if (!props.modelValue || contentShow.value || dialog.value!.contains(e.target as HTMLElement)) return;
            contentMove.value = false;
            const { clientWidth, clientHeight } = dialog.value!;
            const centerX = clientWidth / 2;
            const centerY = clientHeight / 2;
            const pageY = e.pageY - centerY;
            const pageX = e.pageX - centerX;
            contentX.value = `${pageX / clientWidth * 100}vw`;
            contentY.value = `${pageY / clientHeight * 100}vh`;
            // css3动画生命周期结束后再设置过渡动画
            timer = setTimeout(() => {
                contentMove.value = true;
                contentShow.value = true;
            }, isFirefox ? 100 : 0); // firefox上 有 bug，需要延迟 100 毫秒
        }

        function onClose(e: MouseEvent) {
            // console.log("onClose >>", e.target);
            if ((e && e.target === dialog.value && props.closeByMask) || (e && e.target === closeBtn.value)) {
                context.emit("update:modelValue", false);
                context.emit("close");
            }
        }

        onMounted(function() {
            // 该操作只能用在 vue 2.x 里面，3.x 会报错
            // if (props.appendToBody) {
            //     // 节点初始化之后移动至<body>处
            //     dialog.value!.remove();
            //     document.body.appendChild(dialog.value!);
            // }
            document.addEventListener("click", setContentPosition);
        });

        onUnmounted(function() {
            document.removeEventListener("click", setContentPosition);
            timer && clearTimeout(timer);
            // props.appendToBody && dialog.value!.remove(); // 插入至body处的节点要单独移除
        });

        return function() {
            const Dialog = () => (
                <Transition
                    name="fade"
                    appear={ true }
                    // enterToClass="fade-enter-from"
                    // enterActiveClass="fade-enter-active"
                    // enterFromClass="fade-enter-active fade-enter-from"
                    // leaveFromClass="fade-leave-active fade-leave-to"
                    // leaveToClass="fade-leave-to"
                    // leaveActiveClass="fade-leave-active"
                >
                    <div
                        ref={ dialog }
                        class="base-dialog flex fvertical fcenter"
                        style={{ zIndex: _zIndex }}
                        v-show={ props.modelValue }
                        onClick={ e => onClose(e) }
                    >
                        <div
                            class={ `base-dialog-content flex${contentMove.value ? " moving" : ""}${contentShow.value ? " opened" : ""}` }
                            style={{ 'width': props.width, 'transform': `translate3d(${contentX.value}, ${contentY.value}, 0) scale(0)` }}
                        >   
                            <div class="base-dialog-title flex fbetween fvertical">
                                <h2>{ props.title }</h2>
                                <i ref={ closeBtn } onClick={ e => onClose(e) }></i>
                            </div>
                            <div class="base-dialog-body">{ context.slots.default?.() }</div>
                            <div class="base-dialog-footer">{ context.slots.footer?.() }</div>
                        </div>
                    </div>
                </Transition>
            );
            return props.appendToBody ? (<Teleport to="body"><Dialog /></Teleport>) : <Dialog />;
        } 
    }
})