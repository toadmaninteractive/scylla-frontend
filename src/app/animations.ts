import { animate, group, query, style, transition, trigger } from '@angular/animations';

const animationTiming = '350ms ease-in-out';

const initialPageState = query(
    ':enter, :leave',
    style({
        position: 'absolute',
        width: '100%',
        top: '0',
        bottom: '0',
    }),
    { optional: true }
);

const onPageForward = group([
    query(
        ':enter',
        [
            style({ transform: 'scale(0.99)', opacity: 0 }),
            animate(animationTiming, style({ transform: 'scale(1)', opacity: 1 })),
        ],
        { optional: true }
    ),
    query(
        ':leave',
        [
            style({ transform: 'scale(1)', opacity: 1 }),
            animate(animationTiming, style({ transform: 'scale(0.99)', opacity: 0 })),
        ],

        { optional: true }
    ),
]);

export const routeTransitionAnimations = trigger('routingAnimation', [
    transition('* <=> *', [initialPageState, onPageForward]),
]);
