interface HamsterLoaderProps {
  size?: 'small' | 'medium' | 'large';
}

export default function HamsterLoader({ size = 'medium' }: HamsterLoaderProps) {
  const fontSize = size === 'small' ? '10px' : size === 'large' ? '16px' : '14px';

  return (
    <div className="flex items-center justify-center">
      <div
        role="img"
        aria-label="Orange and tan hamster running in a metal wheel"
        style={{
          position: 'relative',
          width: '12em',
          height: '12em',
          fontSize
        }}
      >
        <div
          className="wheel"
          style={{
            position: 'absolute',
            borderRadius: '50%',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(100% 100% at center, hsla(0,0%,60%,0) 47.8%, hsl(0,0%,60%) 48%)',
            zIndex: 2
          }}
        />

        <div
          className="hamster"
          style={{
            position: 'absolute',
            animation: 'hamster 1s ease-in-out infinite',
            top: '50%',
            left: 'calc(50% - 3.5em)',
            width: '7em',
            height: '3.75em',
            transform: 'rotate(4deg) translate(-0.8em, 1.85em)',
            transformOrigin: '50% 0',
            zIndex: 1
          }}
        >
          <div
            className="hamster__body"
            style={{
              position: 'absolute',
              animation: 'hamsterBody 1s ease-in-out infinite',
              background: 'hsl(30,90%,90%)',
              borderRadius: '50% 30% 50% 30% / 15% 60% 40% 40%',
              boxShadow: '0.1em 0.75em 0 hsl(30,90%,55%) inset, 0.15em -0.5em 0 hsl(30,90%,80%) inset',
              top: '0.25em',
              left: '2em',
              width: '4.5em',
              height: '3em',
              transformOrigin: '17% 50%',
              transformStyle: 'preserve-3d'
            }}
          >
            <div
              className="hamster__head"
              style={{
                position: 'absolute',
                animation: 'hamsterHead 1s ease-in-out infinite',
                background: 'hsl(30,90%,55%)',
                borderRadius: '70% 30% 0 100% / 40% 25% 25% 60%',
                boxShadow: '0 -0.25em 0 hsl(30,90%,80%) inset, 0.75em -1.55em 0 hsl(30,90%,90%) inset',
                top: 0,
                left: '-2em',
                width: '2.75em',
                height: '2.5em',
                transformOrigin: '100% 50%'
              }}
            >
              <div
                className="hamster__ear"
                style={{
                  position: 'absolute',
                  animation: 'hamsterEar 1s ease-in-out infinite',
                  background: 'hsl(0,90%,85%)',
                  borderRadius: '50%',
                  boxShadow: '-0.25em 0 hsl(30,90%,55%) inset',
                  top: '-0.25em',
                  right: '-0.25em',
                  width: '0.75em',
                  height: '0.75em',
                  transformOrigin: '50% 75%'
                }}
              />
              <div
                className="hamster__eye"
                style={{
                  position: 'absolute',
                  animation: 'hamsterEye 1s linear infinite',
                  backgroundColor: 'hsl(0,0%,0%)',
                  borderRadius: '50%',
                  top: '0.375em',
                  left: '1.25em',
                  width: '0.5em',
                  height: '0.5em'
                }}
              />
              <div
                className="hamster__nose"
                style={{
                  position: 'absolute',
                  background: 'hsl(0,90%,75%)',
                  borderRadius: '35% 65% 85% 15% / 70% 50% 50% 30%',
                  top: '0.75em',
                  left: 0,
                  width: '0.2em',
                  height: '0.25em'
                }}
              />
            </div>

            <div
              className="hamster__limb hamster__limb--fr"
              style={{
                position: 'absolute',
                clipPath: 'polygon(0 0,100% 0,70% 80%,60% 100%,0% 100%,40% 80%)',
                top: '2em',
                left: '0.5em',
                width: '1em',
                height: '1.5em',
                transformOrigin: '50% 0',
                animation: 'hamsterFRLimb 1s linear infinite',
                background: 'linear-gradient(hsl(30,90%,80%) 80%, hsl(0,90%,75%) 80%)',
                transform: 'rotate(15deg) translateZ(-1px)'
              }}
            />
            <div
              className="hamster__limb hamster__limb--fl"
              style={{
                position: 'absolute',
                clipPath: 'polygon(0 0,100% 0,70% 80%,60% 100%,0% 100%,40% 80%)',
                top: '2em',
                left: '0.5em',
                width: '1em',
                height: '1.5em',
                transformOrigin: '50% 0',
                animation: 'hamsterFLLimb 1s linear infinite',
                background: 'linear-gradient(hsl(30,90%,90%) 80%, hsl(0,90%,85%) 80%)',
                transform: 'rotate(15deg)'
              }}
            />
            <div
              className="hamster__limb hamster__limb--br"
              style={{
                position: 'absolute',
                borderRadius: '0.75em 0.75em 0 0',
                clipPath: 'polygon(0 0,100% 0,100% 30%,70% 90%,70% 100%,30% 100%,40% 90%,0% 30%)',
                top: '1em',
                left: '2.8em',
                width: '1.5em',
                height: '2.5em',
                transformOrigin: '50% 30%',
                animation: 'hamsterBRLimb 1s linear infinite',
                background: 'linear-gradient(hsl(30,90%,80%) 90%, hsl(0,90%,75%) 90%)',
                transform: 'rotate(-25deg) translateZ(-1px)'
              }}
            />
            <div
              className="hamster__limb hamster__limb--bl"
              style={{
                position: 'absolute',
                borderRadius: '0.75em 0.75em 0 0',
                clipPath: 'polygon(0 0,100% 0,100% 30%,70% 90%,70% 100%,30% 100%,40% 90%,0% 30%)',
                top: '1em',
                left: '2.8em',
                width: '1.5em',
                height: '2.5em',
                transformOrigin: '50% 30%',
                animation: 'hamsterBLLimb 1s linear infinite',
                background: 'linear-gradient(hsl(30,90%,90%) 90%, hsl(0,90%,85%) 90%)',
                transform: 'rotate(-25deg)'
              }}
            />
            <div
              className="hamster__tail"
              style={{
                position: 'absolute',
                animation: 'hamsterTail 1s linear infinite',
                background: 'hsl(0,90%,85%)',
                borderRadius: '0.25em 50% 50% 0.25em',
                boxShadow: '0 -0.2em 0 hsl(0,90%,75%) inset',
                top: '1.5em',
                right: '-0.5em',
                width: '1em',
                height: '0.5em',
                transform: 'rotate(30deg) translateZ(-1px)',
                transformOrigin: '0.25em 0.25em'
              }}
            />
          </div>
        </div>

        <div
          className="spoke"
          style={{
            position: 'absolute',
            borderRadius: '50%',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            animation: 'spoke 1s linear infinite',
            background: 'radial-gradient(100% 100% at center, hsl(0,0%,60%) 4.8%, hsla(0,0%,60%,0) 5%), linear-gradient(hsla(0,0%,55%,0) 46.9%, hsl(0,0%,65%) 47% 52.9%, hsla(0,0%,65%,0) 53%) 50% 50% / 99% 99% no-repeat'
          }}
        />
      </div>

      <style>{`
        @keyframes hamster {
          from, to {
            transform: rotate(4deg) translate(-0.8em, 1.85em);
          }
          50% {
            transform: rotate(0) translate(-0.8em, 1.85em);
          }
        }

        @keyframes hamsterHead {
          from, 25%, 50%, 75%, to {
            transform: rotate(0);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(8deg);
          }
        }

        @keyframes hamsterEye {
          from, 90%, to {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0);
          }
        }

        @keyframes hamsterEar {
          from, 25%, 50%, 75%, to {
            transform: rotate(0);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(12deg);
          }
        }

        @keyframes hamsterBody {
          from, 25%, 50%, 75%, to {
            transform: rotate(0);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(-2deg);
          }
        }

        @keyframes hamsterFRLimb {
          from, 25%, 50%, 75%, to {
            transform: rotate(50deg) translateZ(-1px);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(-30deg) translateZ(-1px);
          }
        }

        @keyframes hamsterFLLimb {
          from, 25%, 50%, 75%, to {
            transform: rotate(-30deg);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(50deg);
          }
        }

        @keyframes hamsterBRLimb {
          from, 25%, 50%, 75%, to {
            transform: rotate(-60deg) translateZ(-1px);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(20deg) translateZ(-1px);
          }
        }

        @keyframes hamsterBLLimb {
          from, 25%, 50%, 75%, to {
            transform: rotate(20deg);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(-60deg);
          }
        }

        @keyframes hamsterTail {
          from, 25%, 50%, 75%, to {
            transform: rotate(30deg) translateZ(-1px);
          }
          12.5%, 37.5%, 62.5%, 87.5% {
            transform: rotate(10deg) translateZ(-1px);
          }
        }

        @keyframes spoke {
          from {
            transform: rotate(0);
          }
          to {
            transform: rotate(-1turn);
          }
        }
      `}</style>
    </div>
  );
}
